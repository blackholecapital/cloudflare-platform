import { cfRequest } from "./cloudflare.js";

export async function createKV(
    env,
    name
){

    return cfRequest(
        env,
        `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces`,
        {
            method:"POST",

            body:JSON.stringify({
                title:name
            })
        }
    );

}
