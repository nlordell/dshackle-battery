/**
 * Simple JSON RPC reverse proxy that intercepts and handles a custom
 * `proxy_echo` RPC method that just echos its paramters. This is helpful for
 * detecting request-response mangling.
 */

const http = require("http");
const fetch = require("node-fetch");

const [cmd, path, port, upstream, ...rest] = process.argv;
if (port === undefined || upstream === undefined || rest.length > 0) {
  console.error(`USAGE: ${cmd} ${path} PORT UPSTREAM`);
  process.exit(1);
}

function badRequest(res) {
  res.writeHead(400);
  res.end();
}

function isEchoRequest({ id, method, params }) {
  return id !== undefined && method === "proxy_echo" &&
    params !== undefined;
}

function echoResponse({ id, params }) {
  return {
    jsonrpc: "2.0",
    result: params,
    id,
  };
}

function handler(req, res) {
  if (req.method !== "POST") {
    return badRequest(res);
  }

  let body = "";
  req.on("data", (data) => {
    body += data;
  });
  req.on("end", () => {
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      return badRequest(res);
    }

    if (Array.isArray(json) ? json.every(isEchoRequest) : isEchoRequest(json)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(
        Array.isArray(json) ? json.map(echoResponse) : echoResponse(json),
      ));
    }

    fetch(upstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    })
      .then(async (rpc) => {
        const status = rpc.status;
        const body = await rpc.text();

        try {
          const result = JSON.parse(body);

          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch {
          res.writeHead(status);
          res.end(body);
        }
      })
      .catch((err) => {
        console.warn(`WARN: ${err}`);
        return badRequest(res);
      });
  });
}

const server = http.createServer(handler);
server.listen(parseInt(port));
