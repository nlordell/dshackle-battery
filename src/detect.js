/**
 * Simple script that repeadly generates random `proxy_echo` batched JSON RPC
 * requests and executes them until a mis-match is found.
 */

const fetch = require("node-fetch");

const [cmd, path, remote, ...rest] = process.argv;
if (remote === undefined || rest.length > 0) {
  console.error(`USAGE: ${cmd} ${path} REMOTE`);
  process.exit(1);
}

function randomAddress() {
  return "0x" + [...Array(20)]
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"))
    .join("");
}

function randomCall() {
  return {
    "jsonrpc": "2.0",
    "method": "proxy_echo",
    "params": [randomAddress()],
    "id": ~~(Math.random() * 2147483647),
  };
}

async function detectMismatch() {
  const requests = [...Array(2)].map(() => randomCall());

  const response = await fetch(remote, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requests),
  });
  const results = await response.json();

  requests.sort((a, b) => a.id - b.id);
  results.sort((a, b) => a.id - b.id);

  let diff = false;
  for (let i = 0; i < requests.length; i++) {
    const [param] = requests[i].params;
    const [result] = results[i].result;
    if (param !== result) {
      diff = true;
    }
  }

  if (diff) {
    console.log(`> ${JSON.stringify(requests)}`);
    console.log(`< ${JSON.stringify(results)}`);
  }

  return diff
}

(async () => {
  while (!await detectMismatch()) {}
})().catch((err) => {
  console.log(err);
  process.exit(1);
});
