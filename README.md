# Dskackle Battery

Run some tests on request/response mangling with Dshackle

## Running

1. First start a local RPC proxy. This is just a simple JSON RPC server that
   proxies to some remote, and handles a custom `proxy_echo` method that just
   echos the specified `params` in the response `result`. This is the mechanism
   we use to detect request-response mangling.

   ```sh
   node src/proxy.js 9545 https://cloudflare-eth.com/v1/mainnet
   ```

2. Simultaneously run Dshackle with the specified
   [minimal configuration](./config/dshackle.yaml). Easiest way is to use
   Docker.

   ```sh
   docker run -it --rm --net host -v "$(pwd)/config:/etc/dshackle" emeraldpay/dshackle:0.13.1
   ```

   Wait for the upstream to be ready:

   ```
   ...
   2022-09-11 14:46:36.214 | INFO  |          Multistream | State of ETH: height=15933153, status=[OK/1], lag=[0], weak=[]
   ...
   ```

3. Start the detection script that will repeatedly place batch calls until the
   response gets mangled. This typically doesn't take very long.

   ```sh
   node src/detect.js http://localhost:8545/eth
   ```

   Example output:

   ```
   > [{"jsonrpc":"2.0","method":"proxy_echo","params":["0x907380dfe23109f6bab43af75e0cf4f50af0b3f0"],"id":1178957775},{"jsonrpc":"2.0","method":"proxy_echo","params":["0x0e193255c2c2051da95ef0e810ad3f952a7525eb"],"id":1733997311}]
   < [{"jsonrpc":"2.0","id":1178957775,"result":["0x0e193255c2c2051da95ef0e810ad3f952a7525eb"]},{"jsonrpc":"2.0","id":1733997311,"result":["0x0e193255c2c2051da95ef0e810ad3f952a7525eb"]}]
   ```
