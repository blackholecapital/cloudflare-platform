import { Hono } from "hono";
import { provisionCustomer } from "./services/provisioner.js";


const app = new Hono();

app.options("*", (c) => {

  c.header(
    "Access-Control-Allow-Origin",
    "https://onboard.blackholecapital.xyz"
  );

  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  return c.body(null, 204);

});

app.use("*", async (c, next) => {

  c.header(
    "Access-Control-Allow-Origin",
    "https://onboard.blackholecapital.xyz"
  );

  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204
    });
  }

  await next();

});


app.get("/", c => {

  return c.json({
    service: "Cloudflare Operations Platform",
    version: "1.0.0",
    status: "online"
  });

});


app.get("/api/health", c => {

  return c.json({
    connected: true,
    status: "healthy"
  });

});


app.post("/api/preview", async c => {

  const request = await c.req.json();

  return c.json({

    status: "preview",

    request,

    actions: [
      {
        type: "pages",
        action: "create"
      },
      {
        type: "worker",
        action: "create"
      },
      {
        type: "d1",
        action: "create"
      },
      {
        type: "kv",
        action: "create"
      }
    ]

  });

});


app.post("/api/provision", async c => {

  const request = await c.req.json();

  const result = await provisionCustomer(request);

  return c.json({

    status:"accepted",

    result

  });

});


export default app;
