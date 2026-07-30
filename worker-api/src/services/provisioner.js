import { createD1 } from "../providers/d1.js";
import { createKV } from "../providers/kv.js";

export async function provisionCustomer(request, env){

    const results = [];

    for (const service of request.services){

        if(service === "KV"){

            const namespace = await createKV(
                env,
                `${request.company.toLowerCase().replace(/\s+/g,"-")}-kv`
            );

            results.push({

                service,

                status:"created",

                id: namespace.id,

                title: namespace.title

            });

            continue;

        }



        if(service === "D1 Database"){

            const database = await createD1(
                env,
                `${request.company.toLowerCase().replace(/\s+/g,"-")}-db`
            );

            results.push({

                service,

                status:"created",

                id: database.uuid,

                name: database.name

            });

            continue;

        }

        results.push({

            service,

            status:"planned",

            message:`${service} provisioning queued`

        });

    }

    return {

        customer: request.company,

        domain: request.domain,

        results

    };

}
