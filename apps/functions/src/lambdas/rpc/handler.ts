import { BitcoinNetworkNames } from "@0xflick/ordinals-models";
import type { Handler } from "aws-lambda";
import { spawnSync } from "child_process";
import { parse } from "dotenv";

// Decrypt the SOPS-encrypted RPC secret file at cold start
// SOPS binary is placed at the root of the layer: /opt/sops
// Decrypt .env.<name>
const { stdout, stderr, status } = spawnSync(
  "/opt/sops",
  ["-d", "/opt/.env.rpc"],
  { encoding: "utf-8" },
);
if (status !== 0) throw new Error(stderr);
Object.assign(process.env, parse(stdout));

const { handler: innerHandler } = await import("./inner");

// Export the original handler, with secrets loaded
export const handler: Handler = innerHandler;
