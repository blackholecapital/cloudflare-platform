export async function cfRequest(
    env,
    path,
    options = {}
){

    const headers = {
        Authorization:
            `Bearer ${env.CLOUDFLARE_API_TOKEN}`,

        ...(options.headers || {})
    };


    const isFormData =
        options.body instanceof FormData;


    if(
        !headers["Content-Type"] &&
        options.body &&
        !isFormData
    ){

        headers["Content-Type"] =
            "application/json";

    }


    const response = await fetch(
        `https://api.cloudflare.com/client/v4${path}`,
        {
            ...options,
            headers
        }
    );


    const data =
        await response.json();


    if(!data.success){

        throw new Error(
            JSON.stringify(data.errors)
        );

    }


    return data.result;

}
