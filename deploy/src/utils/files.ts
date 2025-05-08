import path from "path";
import fs from "fs";

import { parse } from "dotenv";
import { spawnSync } from "child_process";

import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function jsonFromNodeModules(file: string) {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, `../../node_modules/${file}`),
      "utf8",
    ),
  );
}

export function textFromSecret(file: string) {
  // Check if we're in localstack mode
  const isLocalstack = process.env.DEPLOYMENT === "localstack";

  if (isLocalstack) {
    // Use pre-decrypted secrets in localstack mode
    const decryptedPath = path.join(
      __dirname,
      "../../dist/decrypted-secrets",
      file,
    );
    if (!fs.existsSync(decryptedPath)) {
      throw new Error(
        `Decrypted secret file not found: ${decryptedPath}. Please run the decrypt-secrets script first.`,
      );
    }
    return fs.readFileSync(decryptedPath, "utf8");
  }

  // For non-localstack deployments, use sops directly
  const { stdout, stderr } = spawnSync("sops", ["--decrypt", file], {
    cwd: path.join(__dirname, "../../../secrets"),
    encoding: "utf8",
    env: process.env, // Pass through all environment variables
  });
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
}

export function jsonFromSecret(file: string) {
  return JSON.parse(textFromSecret(file));
}

export function readJSONSync(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function parseEnv(file: string) {
  return parse(textFromSecret(file));
}
