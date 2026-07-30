import { Hono } from "hono";

const app = new Hono();

app.get("/",c=>{

    return c.json({

        service:"Cloudflare Operations Platform",

        status:"online"

    });

});

app.get("/api/health",c=>{

    return c.json({

        connected:true,

        status:"healthy"

    });

});

app.post("/api/preview",async c=>{

    const request=await c.req.json();

    return c.json({

        status:"preview",

        request,

        actions:[

            "Create Pages",

            "Create Worker",

            "Create D1",

            "Create KV"

        ]

    });

});

app.post("/api/provision",async c=>{

    const request=await c.req.json();

    return c.json({

        status:"queued",

        request

    });

});

export default app;
