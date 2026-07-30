export async function provisionCustomer(request){

    const results = [];

    for (const service of request.services){

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
