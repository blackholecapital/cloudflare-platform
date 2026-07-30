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

    console.log(
        "FULL STATE",
        JSON.stringify(state)
    );

    const createdAt =
        state.createdAt ?? new Date().toISOString();

    const safeCustomer =
        customer ?? "unknown";


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
            safeCustomer,
            state.customer ?? safeCustomer,
            state.domain ?? "",
            createdAt
        )
        .run();


    for(
        const [type,value]
        of Object.entries(state.resources ?? {})
    ){

        console.log(
            "STATE RESOURCE",
            JSON.stringify({
                type,
                value
            })
        );


        await env.STATE_DB
            .prepare(
                `
                INSERT INTO resources
                (
                    customer_id,
                    resource_type,
                    resource_id,
                    resource_name,
                    created_at
                )
                VALUES (?,?,?,?,?)
                `
            )
            .bind(
                safeCustomer,
                type ?? "unknown",
                value ?? "",
                value ?? "",
                createdAt
            )
            .run();

    }

}
