import { cfRequest } from "./cloudflare.js";


export async function findPagesProject(
    env,
    name
){

    const result =
        await cfRequest(
            env,
            `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`
        );


    return result.find(
        project => project.name === name
    );

}


export async function createPagesProject(
    env,
    name
){

    const existing =
        await findPagesProject(
            env,
            name
        );


    if(existing){

        return {

            id: existing.id,

            name: existing.name,

            existing:true

        };

    }


    const project =
        await cfRequest(
            env,
            `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`,
            {
                method:"POST",

                body:JSON.stringify({

                    name,

                    production_branch:"main"

                })

            }
        );


    return {

        id:project.id,

        name:project.name,

        existing:false

    };

}
