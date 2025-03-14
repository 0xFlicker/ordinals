import path from "path";
import fs from "fs";
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
  const { stdout, stderr } = spawnSync("sops", ["--decrypt", file], {
    cwd: path.join(__dirname, "../../../secrets"),
    encoding: "utf8",
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
