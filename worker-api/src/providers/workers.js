export async function deployWorker(
    env,
    name,
    bindings = []
){

    const script = `
addEventListener("fetch", event => {

    event.respondWith(
        new Response(
            "Worker ${name} online"
        )
    );

});
`;


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

        metadata:{
            bindings
        }

    };

}
