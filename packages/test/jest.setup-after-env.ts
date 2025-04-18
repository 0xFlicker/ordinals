import { spawn } from "child_process";
import tables from "./tables";
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ChildProcessWithoutNullStreams } from "child_process";
import S3rver from "s3rver";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

let dbProcess: ChildProcessWithoutNullStreams | null;
let s3instance: S3rver;
const s3TempDir = join(tmpdir(), "s3rver");

async function startDb() {
  return new Promise<void>((resolve, reject) => {
    dbProcess = spawn("java", [
      "-Djava.library.path=./dynamodb_local_latest/DynamoDBLocal_lib",
      "-jar",
      "./dynamodb_local_latest/DynamoDBLocal.jar",
      "-inMemory",
      "-port",
      "8000",
    ]);

    dbProcess.stdout.on("data", (data) => {
      console.log(data.toString());
      if (
        data
          .toString()
          .includes(
            "Initializing DynamoDB Local with the following configuration",
          )
      ) {
        resolve();
      }
    });

    dbProcess.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    dbProcess.on("error", (err) => {
      reject(err);
    });
  });
}

function stopDb() {
  if (dbProcess) {
    dbProcess.kill();
    dbProcess = null;
  }
}

async function createTables() {
  // Create DynamoDB client for local instance
  const client = new DynamoDBClient({
    endpoint: "http://localhost:8000",
    region: "us-east-1",
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local",
    },
  });

  // Create each table defined in tables.ts
  for (const table of tables) {
    try {
      await client.send(new CreateTableCommand(table));
    } catch (error: any) {
      // If table already exists, that's fine
      if (error.name === "ResourceInUseException") {
        console.log(`Table already exists: ${table.TableName}`);
      } else {
        console.error(`Error creating table ${table.TableName}:`, error);
      }
    }
  }
  console.log(`Created tables: ${tables.map((t) => t.TableName).join(", ")}`);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await client.send(
    new PutCommand({
      TableName: "Funding",
      Item: {
        pk: "1",
        sk: "funding",
        address: "1234567890",
        destinationAddress: "1234567890",
        fundingAmountBtc: "1000",
        fundingAmountSat: 1000,
        fundingStatus: "funding",
      },
    }),
  );
}

beforeAll(async () => {
  // Start DynamoDB
  await startDb();
  // Wait for DynamoDB to start up
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await createTables();

  // Create temp directory if it doesn't exist
  if (!existsSync(s3TempDir)) {
    mkdirSync(s3TempDir, { recursive: true });
  }

  // Start S3 mock server
  s3instance = new S3rver({
    port: 4569,
    address: "127.0.0.1",
    directory: s3TempDir,
    silent: true,
  });
  await s3instance.run();

  process.env.S3_ENDPOINT = "http://127.0.0.1:4569";
});

afterAll(async () => {
  stopDb();
  await s3instance.close();
  console.log(`S3rver data directory: ${s3TempDir}`);
});
