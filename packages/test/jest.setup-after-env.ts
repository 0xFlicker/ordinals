import { spawn, exec } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, existsSync, rmSync } from "fs";
import type { ChildProcessWithoutNullStreams } from "child_process";
import dotenv from "dotenv";

// Load .env.test file
dotenv.config({ path: ".env.test" });

let composeProcess: ChildProcessWithoutNullStreams;


// helper to run a one‑off command and inherit stdio
function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, { stdio: "inherit" });

    // Wait for the process to exit
    ps.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
      }
    });

    ps.on("error", (err) => {
      reject(err);
    });
  });
}

beforeAll(async () => {
  // in cases where the test did not tear down properly, remove all prior volumes
  await run("docker", ["compose", "down", "-v"]);

  console.log("Listening to logs...");

  // bring up all services, attached so we can watch logs
  composeProcess = spawn("docker", ["compose", "logs", "-f"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  console.log("Starting services...");

  console.log("Waiting for mempool to sync...");
  await Promise.all([
    run("docker", ["compose", "up", "-d"]),
    new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timed out waiting for mempool to sync"));
      }, 300_000); // 5 minutes

      const handler = (chunk: Buffer) => {
        const line = chunk.toString();
        console.log(line);
        if (line.includes("The mempool is now in sync!")) {
          console.log("Mempool synced");
          clearTimeout(timeout);
          composeProcess.stdout.removeListener("data", handler);
          composeProcess.removeListener("exit", exitHandler);
          resolve();
        }
      };

      const exitHandler = (code: number) => {
        clearTimeout(timeout);
        composeProcess.stdout.removeListener("data", handler);
        composeProcess.removeListener("exit", exitHandler);
        console.log(`docker compose exited with code ${code}`);
        resolve();
      };

      composeProcess.stdout.addListener("data", handler);
      composeProcess.addListener("exit", exitHandler);
    }),
  ]);
}, 360000);

afterAll(async () => {
  // tear down and remove volumes
  if (process.env.TEARDOWN !== "false") {
    await run("docker", ["compose", "down", "-v"]);
  }

  // kill the attached compose up if it's still running
  if (composeProcess && !composeProcess.killed) {
    composeProcess.kill();
  }
}, 1200000);
