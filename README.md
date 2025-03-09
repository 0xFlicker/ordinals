# 0xflick ordinals

You're expecting documentations?

You want me to make this easy?

Well sorry.... I'm still figuring out a lot of this stuff myself.

## Packages

- [apps/cli](./apps/cli/) Command line tools for doing all sorts of useful things
- [apps/graphql-backend](./apps/graphql-backend/) A local dev focused backend
- [apps/www](./apps/www/) This will eventually be a minting website
- [ordinals/axolotl-valley](./ordinals/axolotl-valley/) A fully functioning example recursive ordinal with reveal and $4 inscriptions
- [packages/assets](./packages/assets/) Tools for generating assets on a canvas in Typescript
- [packages/backend](./packages/backend/) All the bits for talking to stateful and cloud things
- [packages/graphql](./packages/graphql/) Graphql resolvers, to make building the API easier for me
- [packages/models](./packages/models/) Common models for representing all the things
- [packages/inscriptions](./packages/inscriptions/) Typescript inscription library
- [packages/rbac](./packages/rbac/) A little heavy for what's need with permissions, but it's flexible
- [packages/rbac-models](./packages/rbac-models/) Only split out for the frontend to pull in w/o any backend dependencies

## Development

You will need a local bitcoin regtest, electrum compatible server, and mempool API.

- Download and install bitcoin core: https://bitcoin.org/en/download
- Clone this repo: https://github.com/mempool/mempool
- Clone this repo: https://github.com/romanz/electrs

Generate an RPC user and password:

````bash
# Generate RPC credentials
export RPC_USER="bitcoinrpc"
export RPC_PASS=$(openssl rand -base64 32)
export RPC_SALT=$(openssl rand -hex 16)
export RPC_HMAC=$(echo -n "$RPC_PASS" | openssl dgst -sha256 -hmac "$RPC_SALT" | cut -d' ' -f2)
export RPC_AUTH="$RPC_USER:$RPC_SALT\$$RPC_HMAC"

echo "Generated RPC credentials:"
echo "Username: $RPC_USER"
echo "Password: $RPC_PASS"
echo "Auth string: $RPC_AUTH"
```

When starting mempool via docker, it will probably connect to the default docker bridge network.

```bash
export DOCKER_NETWORK_MASK=$(docker network inspect bridge | jq -r .[0].IPAM.Config[0].Subnet)
export DOCKER_NETWORK_GATEWAY=$(docker network inspect bridge | jq -r .[0].IPAM.Config[0].Gateway)

echo "DOCKER_NETWORK_MASK: $DOCKER_NETWORK_MASK"
echo "DOCKER_NETWORK_GATEWAY: $DOCKER_NETWORK_GATEWAY"
```

Create a starter .bitcoin.conf:

```bash
mkdir -p ~/.bitcoin
cat << EOF > ~/.bitcoin/bitcoin.conf
[regtest]
  txindex=1
  prune=0
  server=1
  rpcallowip=127.0.0.0/8
  rpcbind=127.0.0.1
  rpcallowip=$DOCKER_NETWORK_MASK
  rpcbind=$DOCKER_NETWORK_GATEWAY
  rpcauth=$RPC_AUTH
EOF
```

Start bitcoind:

```bash
bitcoind -regtest
```

Build and run electrs:

```bash
mkdir -p ~/.electrs

cat << EOF > ~/.electrs/config.toml
auth="bitcoinrpc:$RPC_PASS"
network = "regtest"
electrum_rpc_addr = "$DOCKER_NETWORK_GATEWAY:60001"
log_filters = "DEBUG"
EOF
```

```bash
cargo run --release --bin electrs
```

Now build and launch mempool:

```bash
cd mempool/docker

# edit the regtest.yml to use the correct RPC credentials
cat << EOF > regtest.yml
version: "3.7"

services:
  web:
    environment:
      FRONTEND_HTTP_PORT: "8080"
      BACKEND_MAINNET_HTTP_HOST: "api"
    image: mempool/frontend:latest
    user: "1000:1000"
    restart: on-failure
    stop_grace_period: 1m
    command: "./wait-for db:3306 --timeout=720 -- nginx -g 'daemon off;'"
    ports:
      - 4080:8080
  api:
    environment:
      MEMPOOL_NETWORK: "regtest"
      MEMPOOL_BACKEND: "electrum"
      ELECTRUM_HOST: "$DOCKER_NETWORK_GATEWAY"
      ELECTRUM_PORT: "60001"
      ELECTRUM_TLS_ENABLED: "false"
      CORE_RPC_HOST: "$DOCKER_NETWORK_GATEWAY"
      CORE_RPC_PORT: "18443"
      CORE_RPC_USERNAME: "bitcoinrpc"
      CORE_RPC_PASSWORD: "$RPC_PASS"
      DATABASE_ENABLED: "true"
      DATABASE_HOST: "db"
      DATABASE_DATABASE: "mempool"
      DATABASE_USERNAME: "mempool"
      DATABASE_PASSWORD: "mempool"
      STATISTICS_ENABLED: "true"
    image: mempool/backend:latest
    user: "1000:1000"
    restart: on-failure
    stop_grace_period: 1m
    command: "./wait-for-it.sh db:3306 --timeout=720 --strict -- ./start.sh"
    volumes:
      - ./data:/backend/cache
  db:
    environment:
      MYSQL_DATABASE: "mempool"
      MYSQL_USER: "mempool"
      MYSQL_PASSWORD: "mempool"
      MYSQL_ROOT_PASSWORD: "admin"
    image: mariadb:10.5.21
    user: "1000:1000"
    restart: on-failure
    stop_grace_period: 1m
    volumes:
      - ./mysql/data:/var/lib/mysql
EOF


docker compose -f regtest.yml up -d
```

Congratulations! You've got a local regtest bitcoin network running with mempool and electrs.


If you have not already, generate a bitcoin wallet:

```bash
bitcoin-cli -regtest createwallet "mywallet"
```

Generate some coins:

```bash
bitcoin-cli -regtest --rpcwallet=mywallet generatetoaddress  101 $(bitcoin-cli -regtest --rpcwallet=mywallet getnewaddress)
```

Mint an inscription:

```
Usage: index mint [options] <file>

Mint an ordinal

Options:
  -n, --network <network>                                    Bitcoin network (default: "regtest")
  -a, --address <address>                                    Address to mint to
  -p, --padding <amount>                                     Padding amount (default: 546)
  --parent-inscription <parent-inscription>                  Parent inscription
  --parent-key <parent-key>                                  Parent security key used to generate p2tr
  --parent-txid <parent-txid>                                Parent txid
  --parent-index <parent-index>                              Parent index
  --parent-destination-address <destination-parent-address>  Destination parent address (default: "auto")
  --parent-amount <parent-amount>                            Parent amount
  -m, --mime-type <mime-type>                                Mime type of file
  -f, --fee-rate <fee-rate>                                  Fee rate in satoshis per vbyte
  -w, --rpcwallet <wallet>                                   Bitcoin Wallet name (default: "default")
  -u, --rpcuser <rpcuser>                                    Bitcoin RPC username
  -p, --rpcpassword <rpcpassword>                            Bitcoin RPC password
  --no-send                                                  Don't automatically pay
  -d, --metadata-file <metadata-file>                        Metadata file
  --compress                                                 Compress the file
  -h, --help                                                 display help for command
```

```bash
cd apps/cli
yarn cli mint --rpcuser $RPC_USER --rpcpassword $RPC_PASS --rpcwallet mywallet --network regtest --padding 543 --fee-rate 1 --address $(bitcoin-cli -regtest --rpcwallet=mywallet -named getnewaddress -addresstype bech32m) ./ordinals/axolotl-valley/content/1.png
```

````
