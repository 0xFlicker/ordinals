import { promises as fs } from "fs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export async function loadFont(name: string) {
  if (process.env.DEPLOYMENT === "local") {
    return fs.readFile(process.cwd() + "/fonts/" + name);
  }
  const bucket = process.env.FONT_BUCKET;
  if (!bucket) {
    throw new Error("FONT_BUCKET not set");
  }
  const client = new S3Client({
    region: "us-east-1",
  });
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: name,
  });
  const response = await client.send(command);
  const stream = response.Body as Readable;
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.once("end", () => resolve(Buffer.concat(chunks)));
    stream.once("error", reject);
  });
  return buffer;
}
