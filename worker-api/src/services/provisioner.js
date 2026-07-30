import { createD1 } from "../providers/d1.js";
import { createKV } from "../providers/kv.js";
import { createQueue } from "../providers/queues.js";
import { createR2 } from "../providers/r2.js";
import { createPagesProject } from "../providers/pages.js";
import { saveState, getState } from "../state/store.js";


function slug(value){

    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g,"-")
        .replace(/^-|-$/g,"");

}


export async function provisionCustomer(
    request,
    env
){

    const customer = slug(
        request.company
    );

    const existing = await getState(
        env,
        customer
    );

    if(existing){

        return {

            customer,

            existing:true,

            message:"Customer already provisioned",

            state:existing

        };

    }


    const resources = {};

    const results = [];


    for (const service of request.services){

        console.log("SERVICE RECEIVED:", service);


        if(service === "Cloudflare Pages"){

            const pages =
                await createPagesProject(
                    env,
                    `${customer}-site`
                );


            resources.pages = pages.id;


            results.push({

                service,

                status:"created",

                id:pages.id,

                name:pages.name

            });


            continue;

        }



        if(service === "D1 Database"){

            const database = await createD1(
                env,
                `${customer}-db`
            );

            resources.d1 = database.uuid;

            results.push({

                service,

                status:"created",

                id:database.uuid

            });

            continue;

        }


        if(service === "KV"){

            const namespace = await createKV(
                env,
                `${customer}-kv`
            );

            resources.kv = namespace.id;

            results.push({

                service,

                status:"created",

                id:namespace.id

            });

            continue;

        }


        
if(service === "Queue"){

    const queue = await createQueue(
        env,
        `${customer}-queue`
    );

    resources.queue = queue.id;

    results.push({

        service,

        status:"created",

        id:queue.id,

        name:queue.name

    });

    continue;

}


if(service === "R2"){

            const bucket = await createR2(
                env,
                `${customer}-storage`
            );

            resources.r2 = bucket.name;

            results.push({

                service,

                status:"created",

                name:bucket.name

            });

            continue;

        }


        results.push({

            service,

            status:"planned"

        });

    }


    await saveState(
        env,
        customer,
        {
            customer,
            domain: request.domain,
            resources,
            createdAt:new Date().toISOString()
        }
    );


    return {

        customer,

        resources,

        results

    };

}
