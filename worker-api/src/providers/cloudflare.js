export async function cfRequest(
    env,
    path,
    options = {}
){

    const response = await fetch(
        `https://api.cloudflare.com/client/v4${path}`,
        {
            ...options,
            headers:{
                Authorization:
                    `Bearer ${env.CLOUDFLARE_API_TOKEN}`,

                "Content-Type":
                    "application/json",

                ...(options.headers || {})
            }
        }
    );

    const data = await response.json();

    if(!data.success){

        throw new Error(
            JSON.stringify(data.errors)
        );

    }

    return data.result;

}
