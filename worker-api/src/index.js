import { Hono } from "hono";
import { provisionCustomer } from "./services/provisioner.js";
import { getCustomerState } from "./routes/state.js";
import { createPlan } from "./services/planner.js";
import { executePlan } from "./services/executor.js";
import { listWorkers, inspectWorker, inspectWorkerSource } from "./providers/workers.js";


const app = new Hono();

async function sha256(value) {
  return new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(String(value || ""))
    )
  );
}

async function secretsEqual(a, b) {
  const left = await sha256(a);
  const right = await sha256(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

async function requireOpsAuth(c) {
  const configured = String(c.env.OPS_API_TOKEN || "");
  if (!configured) {
    return c.json({ error: "OPS_API_TOKEN is not configured" }, 503);
  }

  const authorization = String(c.req.header("Authorization") || "");
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const provided = String(c.req.header("X-Ops-Token") || bearer || "");

  if (!provided || !(await secretsEqual(provided, configured))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return null;
}

app.options("*", (c) => {

  c.header(
    "Access-Control-Allow-Origin",
    "https://onboard.blackholecapital.xyz"
  );

  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Ops-Token"
  );

  return c.body(null, 204);

});

app.use("*", async (c, next) => {

  c.header(
    "Access-Control-Allow-Origin",
    "https://onboard.blackholecapital.xyz"
  );

  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Ops-Token"
  );

  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204
    });
  }

  await next();

});


app.get("/", c => {

  return c.json({
    service: "Cloudflare Operations Platform",
    version: "1.1.0",
    status: "online"
  });

});

app.get("/api/workers", async c => {
  const denied = await requireOpsAuth(c);
  if (denied) return denied;

  const workers = await listWorkers(c.env);
  return c.json({ count: workers.length, workers });
});

app.get("/api/workers/:name", async c => {
  const denied = await requireOpsAuth(c);
  if (denied) return denied;

  const worker = await inspectWorker(c.env, c.req.param("name"));
  return c.json(worker);
});

app.get("/api/workers/:name/source", async c => {
  const denied = await requireOpsAuth(c);
  if (denied) return denied;

  const source = await inspectWorkerSource(c.env, c.req.param("name"));
  return c.json(source);
});


app.get("/api/customer/:id", async c => {

    const customer =
        c.req.param("id");

    const state =
        await getCustomerState(
            c.env,
            customer
        );


    if(!state){

        return c.json(
            {
                error:"Customer not found"
            },
            404
        );

    }


    return c.json(state);

});


app.get("/api/health", c => {

  return c.json({
    connected: true,
    status: "healthy",
    workerInspection: true
  });

});


app.post("/api/preview", async c => {

    const request =
        await c.req.json();


    const plan =
        await createPlan(
            c.env,
            request
        );


    return c.json({

        status:"preview",

        plan

    });

});


app.post("/api/provision", async c => {

  const request = await c.req.json();

  const plan = await createPlan(
    c.env,
    request
  );

  const result = await executePlan(
    c.env,
    request,
    plan
  );

  return c.json(result);

});



app.onError((err, c) => {

  console.error(err);

  return c.json({

    error: err.message,

    stack: err.stack

  }, 500);

});

export default app;
