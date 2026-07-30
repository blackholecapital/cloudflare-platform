import { cfRequest } from "./cloudflare.js";


export async function findD1(
    env,
    name
){

    const result = await cfRequest(
        env,
        `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database`
    );

    return result.find(
        db => db.name === name
    );

}


export async function createD1(
    env,
    name
){

    const existing = await findD1(
        env,
        name
    );

    if(existing){

        return existing;

    }


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
