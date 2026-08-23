import { cfRequest } from "./cloudflare.js";

function accountPath(env, suffix = "") {
    return `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts${suffix}`;
}

function safeWorkerName(name = "") {
    const value = String(name || "").trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
        throw new Error("Invalid Worker name");
    }
    return value;
}

function looksSensitive(name = "") {
    return /(token|secret|password|passwd|api[_-]?key|private[_-]?key|auth)/i.test(String(name));
}

function sanitizeBinding(binding = {}) {
    const out = {
        name: binding.name || "",
        type: binding.type || "unknown"
    };

    for (const key of [
        "service",
        "environment",
        "namespace_id",
        "bucket_name",
        "database_id",
        "database_name",
        "dataset",
        "class_name",
        "queue_name"
    ]) {
        if (binding[key] !== undefined) out[key] = binding[key];
    }

    if (binding.type === "plain_text") {
        out.text = looksSensitive(binding.name) ? "[REDACTED]" : String(binding.text ?? "");
    }

    if (binding.type === "secret_text") {
        out.text = "[SECRET]";
    }

    return out;
}

export async function listWorkers(env) {
    const result = await cfRequest(env, accountPath(env));
    return (Array.isArray(result) ? result : []).map(worker => ({
        id: worker.id || worker.name || "",
        created_on: worker.created_on || null,
        modified_on: worker.modified_on || null,
        etag: worker.etag || null,
        handlers: worker.handlers || null,
        last_deployed_from: worker.last_deployed_from || null
    }));
}

export async function inspectWorker(env, name) {
    const workerName = safeWorkerName(name);
    const settings = await cfRequest(
        env,
        accountPath(env, `/${encodeURIComponent(workerName)}/settings`)
    );

    return {
        name: workerName,
        compatibility_date: settings?.compatibility_date || null,
        compatibility_flags: settings?.compatibility_flags || [],
        usage_model: settings?.usage_model || null,
        logpush: settings?.logpush ?? null,
        tail_consumers: settings?.tail_consumers || [],
        bindings: (settings?.bindings || []).map(sanitizeBinding)
    };
}

export async function inspectWorkerSource(env, name, maxBytes = 2_000_000) {
    const workerName = safeWorkerName(name);
    const response = await fetch(
        `https://api.cloudflare.com/client/v4${accountPath(env, `/${encodeURIComponent(workerName)}`)}`,
        {
            headers: {
                Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`
            }
        }
    );

    if (!response.ok) {
        const detail = (await response.text()).slice(0, 1000);
        throw new Error(`Cloudflare Worker source fetch failed (${response.status}): ${detail}`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const text = await response.text();
    const truncated = text.length > maxBytes;

    return {
        name: workerName,
        contentType,
        source: truncated ? text.slice(0, maxBytes) : text,
        truncated,
        sourceLength: text.length
    };
}

export async function deployWorker(
    env,
    name,
    bindings = []
){

    const workerName = safeWorkerName(name);
    const script = `
addEventListener("fetch", event => {

    event.respondWith(
        new Response(
            "Worker ${workerName} online"
        )
    );

});
`;


    const response =
        await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}`,
            {
                method:"PUT",

                headers:{
                    Authorization:
                    `Bearer ${env.CLOUDFLARE_API_TOKEN}`,

                    "Content-Type":
                    "application/javascript"
                },

                body:script
            }
        );


    const data =
        await response.json();


    if(!data.success){

        throw new Error(
            JSON.stringify(data.errors)
        );

    }


    return {

        id:workerName,

        name:workerName,

        metadata:{
            bindings
        }

    };

}
