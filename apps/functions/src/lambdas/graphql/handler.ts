import { spawnSync } from "child_process";
import { parse } from "dotenv";

// Decrypt .env.<name>
const { stdout, stderr, status } = spawnSync(
  "/opt/sops",
  ["-d", "/opt/.env.graphql"],
  { encoding: "utf-8" },
);
if (status !== 0) throw new Error(stderr);
Object.assign(process.env, parse(stdout));

// Delegate to your real handler
export { handler } from "./inner";
