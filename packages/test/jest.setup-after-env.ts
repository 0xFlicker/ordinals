import { spawn } from "child_process";
import S3rver from "s3rver";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, existsSync, rmSync } from "fs";
import type { ChildProcessWithoutNullStreams } from "child_process";
import dotenv from "dotenv";

// Load .env.test file
dotenv.config({ path: ".env.test" });

let s3instance: S3rver;
let composeProcess: ChildProcessWithoutNullStreams;

const s3TempDir = join(tmpdir(), "s3rver");

// helper to run a one‑off command and inherit stdio
function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, { stdio: "inherit" });
    ps.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)),
    );
  });
}

beforeAll(async () => {
  // ensure dirs exist
  for (const d of [s3TempDir]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }

  // start S3 mock
  s3instance = new S3rver({
    port: 4569,
    directory: s3TempDir,
    silent: false,
    resetOnClose: true,
  });
  await s3instance.run();
  process.env.S3_ENDPOINT = "http://127.0.0.1:4569";

  // in cases where the test did not tear down properly, remove all prior volumes
  await run("docker", ["compose", "down", "-v"]);

  // bring up all services, attached so we can watch logs
  composeProcess = spawn("docker", ["compose", "up"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  console.log("Waiting for mempool to sync...");

  // wait until we see the sync message
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for mempool to sync"));
    }, 300_000); // 5 minutes

    composeProcess.stderr.on("data", (chunk) => {
      const line = chunk.toString();
      if (line.includes("The mempool is now in sync!")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    composeProcess.on("exit", (code) => {
      reject(new Error(`docker compose exited with code ${code}`));
    });
  });
  console.log("Mempool synced");
}, 360000);

afterAll(async () => {
  // kill the attached compose up
  composeProcess.kill();

  // tear down and remove volumes
  await run("docker", ["compose", "down", "-v"]);

  // stop S3 mock
  await s3instance.close();

  // clean up any leftover temp dirs if needed
  // (e.g. rmSync(bitcoinTmpDir, { recursive: true, force: true }))
}, 30000);
