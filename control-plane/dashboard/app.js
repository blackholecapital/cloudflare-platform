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

function previewPlan() {

    const req = buildRequest();

    document.getElementById("output").textContent =
JSON.stringify({

    status: "PLAN",

    actions: [

        "Create Pages Project",

        "Create Workers",

        "Create D1 Database",

        "Create KV Namespace"

    ],

    request: req

}, null, 2);

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
