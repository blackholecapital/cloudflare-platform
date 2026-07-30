import { getState } from "../state/store.js";

export async function createPlan(
    env,
    request
){

    const customer =
        request.company
            .toLowerCase()
            .replace(/[^a-z0-9]+/g,"-")
            .replace(/^-|-$/g,"");


    const existing =
        await getState(
            env,
            customer
        );


    const operations = [];


    for(
        const service of request.services
    ){

        if(existing){

            operations.push({

                service,

                action:"existing",

                message:"Customer already provisioned"

            });

            continue;

        }


        operations.push({

            service,

            action:"create",

            message:`Create ${service}`

        });

    }


    return {

        customer,

        existing:!!existing,

        operations

    };

}
