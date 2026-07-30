import { cfRequest } from "./cloudflare.js";

export async function createD1(
    env,
    name
){

    return cfRequest(
        env,
        `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database`,
        {
            method:"POST",

            body:JSON.stringify({
                name
            })
        }
    );

}
