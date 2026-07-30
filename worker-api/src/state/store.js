export async function getState(
    env,
    customer
){

    return await env.STATE_DB
        .prepare(
            "SELECT * FROM customers WHERE id = ?"
        )
        .bind(customer)
        .first();

}


export async function saveState(
    env,
    customer,
    state
){

    const createdAt =
        state.createdAt ?? new Date().toISOString();


    await env.STATE_DB
        .prepare(
            `
            INSERT OR REPLACE INTO customers
            (
                id,
                name,
                domain,
                created_at
            )
            VALUES (?,?,?,?)
            `
        )
        .bind(
            customer,
            state.customer ?? customer,
            state.domain ?? "",
            createdAt
        )
        .run();


    for(
        const [type,value]
        of Object.entries(state.resources ?? {})
    ){

        await env.STATE_DB
            .prepare(
                `
                INSERT INTO resources
                (
                    customer_id,
                    resource_type,
                    resource_id,
                    resource_name,
                    metadata,
                    created_at
                )
                VALUES (?,?,?,?,?,?)
                `
            )
            .bind(
                customer,
                type,
                value ?? "",
                value ?? "",
                JSON.stringify({}),
                createdAt
            )
            .run();

    }

}
