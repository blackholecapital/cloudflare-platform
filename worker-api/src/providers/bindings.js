export function buildD1Binding(
    databaseId,
    bindingName
){

    return {

        type:"d1",

        name:bindingName,

        database_id:databaseId

    };

}
