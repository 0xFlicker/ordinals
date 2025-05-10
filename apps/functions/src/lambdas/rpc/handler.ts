import { BitcoinNetworkNames } from "@0xflick/ordinals-models";
import type { Handler } from "aws-lambda";
import { spawnSync } from "child_process";
import { parse } from "dotenv";

// Decrypt the SOPS-encrypted RPC secret file at cold start
// SOPS binary is placed at the root of the layer: /opt/sops
const result = spawnSync("/opt/sops", ["-d", "/opt/.env.rpc"], {
  encoding: "utf-8",
});
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(`SOPS decryption failed: ${result.stderr}`);
}
const allJsonRpcEnv = parse(result.stdout);
const { BITCOIN_NETWORK: bitcoinNetwork } = process.env as {
  BITCOIN_NETWORK?: BitcoinNetworkNames;
};
if (!bitcoinNetwork) {
  throw new Error("BITCOIN_NETWORK is not set");
}
// Extract environment variables for the specific Bitcoin network
const envPrefix = `${bitcoinNetwork.toUpperCase()}_`;
const resolvedJsonRpcEnv = Object.fromEntries(
  Object.entries(allJsonRpcEnv)
    .filter(([key, value]) => key.startsWith(envPrefix))
    .map(([key, value]) => [key.slice(envPrefix.length), value]),
);
// Parse and assign environment variables
process.env = { ...process.env, ...resolvedJsonRpcEnv };

// Import the real RPC handler
const { handler: innerHandler } = await import("./inner");

// Export the original handler, with secrets loaded
export const handler: Handler = innerHandler;
