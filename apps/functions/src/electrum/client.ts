// uses electrum.d.ts
//
import ElectrumClient from "@mempool/electrum-client";
import { Tx, Address, Script, ScriptData } from "@cmdcode/tapscript";
import crypto from "crypto-js";
import { inspect } from "util";
import { cp } from "fs";

const port = Number.isInteger(Number(process.env.ELECTRUM_PORT))
  ? Number(process.env.ELECTRUM_PORT)
  : 50002;
const host = process.env.ELECTRUM_HOST || "bitcoin.aranguren.org";
const protocol = process.env.ELECTRUM_PROTOCOL || "tls";

console.log(`Connecting to ${host}:${port} over ${protocol}`);
const client = new ElectrumClient(
  port,
  host,
  protocol,
  {},
  {
    onConnect: () => {
      console.log("connected");
    },
    onClose: () => {
      console.log("closed");
    },
    onLog: (str: string) => {
      console.log(str);
    },
  },
);
await client.initElectrum({
  client: "nodejs",
  version: "1.4",
});
// const tx = await client.blockchainTransaction_get(
//   "b945347b8e84dd70343472d22020c5095fa456221dfc1680584ce82f3c26ef80",
//   true,
// );
// console.log("tx", inspect(tx, { depth: null }));
console.log(client.versionInfo);
const addressData = Address.p2tr.decode(
  "bcrt1ps5gmywws7xhyxx5tjy3c56d84zkp9x6j30dft40fw3k3mz36yzfqmsg03x",
);

// const scriptPubKey = Address.p2tr.decode(
//   "bcrt1pdwwexet60xy0wz9yvmqm42zr6uqk62xk3mkrz6ucfd8m3ygl09hqqxn8pf",
// );
const script = Buffer.concat([
  Buffer.from([0x51]), // OP_1
  Buffer.from([0x20]), // Push 32 bytes
  addressData,
]);
// const scriptPubKey = script.toString("hex");
console.log("addressData", script.toString("hex"));
// const scriptPubKey = Script.encode(scriptData.script, true);
// console.log("scriptPubKey", scriptPubKey.hex);

const scriptHash = encodeScriptHash(script.toString("hex"));
// "51206b9d93657a7988f708a466c1baa843d7016d28d68eec316b984b4fb8911f796e",
// "0014f7d8eeca81d0cfed6a1b7e919c9fe25c5ac2a434",

console.log("scriptHash", scriptHash);
// subscribe to the script hash
const sub = await client.blockchainScripthash_subscribe(scriptHash);
client.subscribe.on("blockchain.scripthash.subscribe", (data) => {
  console.log("sub", data);
});
console.log("sub", sub);
const history = await client.blockchainScripthash_listunspent(
  // Buffer.from(
  //   "5e029985cad773cc75877168c7588ab6741cfa42634a8c963e89f8f371830755",
  //   "hex",
  // "bcrt1pg0vkul437sgk7pkc4qvx9yduuq00qnvka7rzlv055yxp6jslhjcqyf6pr2"
  // "e81c1caa25b5f38937d66fd494482d92fbc936f2aae018b97f3f5656427a6219",
  // "e1e19ff3e9f8559025c1226e7b4a86c27ad366071807c2e02e5d61a5e064272b",
  scriptHash,
);

// e1e19ff3e9f8559025c1226e7b4a86c27ad366071807c2e02e5d61a5e064272b
console.log(history);

const balance = await client.blockchainScripthash_getBalance(scriptHash);
console.log("balance", balance);

export default client;

function encodeScriptHash(scriptPubKey: string): string {
  const addrScripthash = crypto.enc.Hex.stringify(
    crypto.SHA256(crypto.enc.Hex.parse(scriptPubKey)),
  );

  // Convert to little-endian (reverse byte order)
  return addrScripthash.match(/.{2}/g)!.reverse().join("");
}
