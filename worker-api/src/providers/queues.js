import { cfRequest } from "./cloudflare.js";

export async function createQueue(
    env,
    name
){

    const result = await cfRequest(
        env,
        `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/queues`,
        {
            method:"POST",

            body:JSON.stringify({
                queue_name:name
            })
        }
    );


    return {

        id: result.queue_id,

        name: result.queue_name

    };

}
