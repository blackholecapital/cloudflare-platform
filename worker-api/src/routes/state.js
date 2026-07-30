export async function getCustomerState(
    env,
    customer
){

    const customerRow =
        await env.STATE_DB
        .prepare(
            "SELECT * FROM customers WHERE id = ?"
        )
        .bind(customer)
        .first();


    if(!customerRow){

        return null;

    }


    const resources =
        await env.STATE_DB
        .prepare(
            "SELECT * FROM resources WHERE customer_id = ?"
        )
        .bind(customer)
        .all();


    return {

        customer: customerRow,

        resources: resources.results

    };

}
