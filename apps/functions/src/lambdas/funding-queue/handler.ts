import { spawnSync } from "child_process";
import { parse } from "dotenv";

// Decrypt .env.<name>
const graphqlEnv = spawnSync("/opt/sops", ["-d", "/opt/.env.graphql"], {
  encoding: "utf8",
});
if (graphqlEnv.status !== 0) throw new Error(graphqlEnv.stderr);

const electrumEnv = spawnSync("/opt/sops", ["-d", "/opt/.env.electrum"], {
  encoding: "utf8",
});
if (electrumEnv.status !== 0) throw new Error(electrumEnv.stderr);

// Parse and merge both env files
Object.assign(process.env, parse(graphqlEnv.stdout), parse(electrumEnv.stdout));

// Delegate to your real handler
export { handler } from "./inner";
