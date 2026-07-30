function selectedServices() {

    return [...document.querySelectorAll(".services input")]
        .filter(c => c.checked)
        .map(c => c.parentElement.textContent.trim());

}

function buildRequest() {

    return {

        company: document.getElementById("company").value.trim(),

        domain: document.getElementById("domain").value.trim(),

        email: document.getElementById("email").value.trim(),

        services: selectedServices(),

        requestedAt: new Date().toISOString()

    };

}

function previewPlan(){

const req=buildRequest();

fetch("https://cloudflare-platform-api.cryptocapitalgroupfl.workers.dev/api/preview",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(req)

})

.then(r=>r.json())

.then(data=>{

document.getElementById("output").textContent=

JSON.stringify(data,null,2);

});

}

function provision() {

    const req = buildRequest();

    document.getElementById("output").textContent =
JSON.stringify({

    status: "READY",

    message:
    "Provision endpoint not connected yet.",

    nextEndpoint:
    "/api/provision",

    request: req

}, null, 2);

}
