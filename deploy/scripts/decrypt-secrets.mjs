import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const secretsDir = path.join(
  __dirname,
  "../../secrets/localhost.localstack.cloud:4566",
);
const decryptedDir = path.join(
  __dirname,
  "../dist/decrypted-secrets/localhost.localstack.cloud:4566",
);

// Ensure decrypted directory exists
if (!fs.existsSync(decryptedDir)) {
  fs.mkdirSync(decryptedDir, { recursive: true });
}

// Get all files from secrets directory
const secretFiles = fs.readdirSync(secretsDir);

console.log("Decrypting secrets...");

for (const file of secretFiles) {
  const inputPath = path.join(secretsDir, file);
  const outputPath = path.join(decryptedDir, file);

  console.log(`Decrypting ${file}...`);

  const { stdout, stderr } = spawnSync("sops", ["--decrypt", inputPath], {
    encoding: "utf8",
  });

  if (stderr) {
    console.error(`Error decrypting ${file}:`, stderr);
    process.exit(1);
  }

  fs.writeFileSync(outputPath, stdout);
  console.log(`Successfully decrypted ${file} to ${outputPath}`);
}

console.log("All secrets decrypted successfully!");
