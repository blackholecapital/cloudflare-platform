import http from "node:http";

const PORT = 8787;

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });

  res.end(JSON.stringify(body, null, 2));
}

const server = http.createServer((req, res) => {

  if (req.method === "OPTIONS") {
    return send(res, 200, {});
  }

  if (req.url === "/api/health") {
    return send(res, 200, {
      connected: true,
      service: "cloudflare-platform-api"
    });
  }

  if (req.url === "/api/preview" && req.method === "POST") {

    let body = "";

    req.on("data", chunk => body += chunk);

    req.on("end", () => {

      const request = JSON.parse(body);

      send(res, 200, {

        status: "preview",

        request,

        actions: [
          "Create Pages Project",
          "Create Worker",
          "Create D1 Database",
          "Create KV Namespace"
        ]

      });

    });

    return;
  }

  send(res,404,{
    error:"Not Found"
  });

});

server.listen(PORT, () => {
  console.log(`Cloudflare Platform API listening on http://localhost:${PORT}`);
});
