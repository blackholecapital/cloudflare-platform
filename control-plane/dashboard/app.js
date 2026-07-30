const API =
"https://cloudflare-platform-api.cryptocapitalgroupfl.workers.dev";


function selectedServices(){

    return [
        ...document.querySelectorAll(".services input:checked")
    ]
    .map(
        c => c.value
    );

}


function buildRequest(){

    return {

        company:
        document.getElementById("company").value.trim(),

        domain:
        document.getElementById("domain").value.trim(),

        email:
        document.getElementById("email").value.trim(),

        services:
        selectedServices(),

        requestedAt:
        new Date().toISOString()

    };

}



async function previewPlan(){

    const req = buildRequest();


    const response =
        await fetch(
            `${API}/api/preview`,
            {
                method:"POST",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:
                JSON.stringify(req)
            }
        );


    const data =
        await response.json();


    document.getElementById(
        "output"
    ).textContent =
        JSON.stringify(
            data,
            null,
            2
        );

}



async function provision(){

    const req = buildRequest();


    document.getElementById(
        "output"
    ).textContent =
        "Provisioning...";


    const response =
        await fetch(
            `${API}/api/provision`,
            {
                method:"POST",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:
                JSON.stringify(req)
            }
        );


    const data =
        await response.json();


    document.getElementById(
        "output"
    ).textContent =
        JSON.stringify(
            data,
            null,
            2
        );

}
