import { cfRequest } from "./cloudflare.js";

export async function createR2(
    env,
    name
){

    return cfRequest(
        env,
        `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets`,
        {
            method:"POST",

            body:JSON.stringify({
                name
            })
        }
    );

}
