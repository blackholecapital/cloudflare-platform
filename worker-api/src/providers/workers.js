export async function findWorker(
    env,
    name
){

    return null;

}


export async function createWorker(
    env,
    name
){

    const script = `
addEventListener("fetch", event => {

    event.respondWith(
        new Response(
            "Cloudflare Platform Worker: ${name}",
            {
                headers:{
                    "content-type":"text/plain"
                }
            }
        )
    );

});
`;


    console.log("WORKER SCRIPT BODY", script);

    const response =
        await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${name}`,
            {
                method:"PUT",

                headers:{
                    Authorization:
                    `Bearer ${env.CLOUDFLARE_API_TOKEN}`,

                    "Content-Type":
                    "application/javascript"
                },

                body:script
            }
        );


    const data =
        await response.json();


    if(!data.success){

        throw new Error(
            JSON.stringify(data.errors)
        );

    }


    return {

        id:name,

        name,

        existing:false

    };

}
