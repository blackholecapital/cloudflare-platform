import { cfRequest } from "./cloudflare.js";

export async function createQueue(
    env,
    name
){

    return cfRequest(
        env,
        `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/queues`,
        {
            method:"POST",

            body:JSON.stringify({
                queue_name:name
            })
        }
    );

}
