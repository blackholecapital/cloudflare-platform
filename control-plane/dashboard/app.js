function values(){

return{

company:document.getElementById("company").value,

domain:document.getElementById("domain").value,

email:document.getElementById("email").value

};

}

function previewPlan(){

const data=values();

document.getElementById("output").textContent=

JSON.stringify({

action:"preview",

customer:data

},null,2);

}

function provision(){

const data=values();

document.getElementById("output").textContent=

JSON.stringify({

action:"provision",

customer:data

},null,2);

}
