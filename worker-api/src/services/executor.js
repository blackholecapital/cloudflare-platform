import { provisionCustomer } from "./provisioner.js";

export async function executePlan(
    env,
    request,
    plan
){

    if(plan.existing){

        return {
            status:"skipped",
            message:"Customer already provisioned",
            plan
        };

    }


    const result =
        await provisionCustomer(
            request,
            env
        );


    return {

        status:"completed",

        result

    };

}
