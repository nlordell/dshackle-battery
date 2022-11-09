const BATCH_SIZE = 50;

function prepareBatch(req, _context, events, next) {
  req.json = [...Array(BATCH_SIZE)].map(() => randomCall());
  events.emit("counter", "rpc.requests", BATCH_SIZE);
  events.emit("counter", "rpc.requests_batched", BATCH_SIZE);
  return next();
}

function prepareCall(req, _context, events, next) {
  req.json = randomCall();
  events.emit("counter", "rpc.requests", 1);
  events.emit("counter", "rpc.requests_single", 1);
  return next();
}

function randomAddress() {
  return [...Array(20)]
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
};

function checkResponses(req, res, _context, events, next) {
  try {
    const json = JSON.parse(res.body);
    const responses = Array.isArray(json) ? json : [json];

    const errors = responses.filter((r) => r.error).length;
    const success = responses.length - errors;

    responses.forEach(() => events.emit("rate", "rpc.request_rate"));
    events.emit("counter", "rpc.responses_success", success);
    events.emit("counter", "rpc.responses_error", errors);
    
    const requests = Array.isArray(req.json) ? req.json : [req.json];
    requests.sort((a, b) => a.id - b.id);
    responses.sort((a, b) => a.id - b.id);
    for (let i = 0; i < responses.length; i++) {
      const [result] = responses[i].result ?? [];
      const [params] = requests[i].params ?? [];
      if (result && result == params) {
        events.emit("counter", "proxy.echo_matches", 1);
      } else {
        events.emit("counter", "proxy.echo_different", 1);
        if (responses[i].id === requests[i].id) {
          console.log(result, params);
        }
      }
    }
  } catch (err) {
    console.log(`${err}: ${res.body}`);
    events.emit("counter", "rpc.invalid_json", 1);
  }

  return next();
}

module.exports = {
  prepareBatch,
  prepareCall,
  checkResponses,
};
