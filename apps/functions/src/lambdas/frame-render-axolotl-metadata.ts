import { GetObjectCommand, S3 } from "@aws-sdk/client-s3";
import { generateTraits } from "@0xflick/ordinals-axolotl-valley-render";
import { utils } from "ethers";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { Readable } from "stream";

const s3 = new S3({
  region: "us-east-1",
});

if (!process.env.SEED_BUCKET) {
  throw new Error("SEED_BUCKET not set");
}

const seedImageBucket = process.env.SEED_BUCKET;

async function getFromS3(key: string): Promise<Buffer> {
  const params = {
    Bucket: seedImageBucket,
    Key: key,
  };
  const data = await s3.getObject(params);
  const stream = data.Body as Readable;
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.once("end", () => resolve(Buffer.concat(chunks)));
    stream.once("error", reject);
  });
  return buffer;
}

async function s3Exists({
  key,
  bucket,
}: {
  key: string;
  bucket: string;
}): Promise<boolean> {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  try {
    await s3.headObject(params);
    return true;
  } catch (err) {
    return false;
  }
}

async function s3WriteObject(key: string, data: string): Promise<void> {
  console.log(`Writing to s3://${seedImageBucket}/${key}`);

  await s3.putObject({
    Bucket: seedImageBucket,
    Key: key,
    Body: data,
    ContentDisposition: "inline",
    ContentType: "application/json",
    Expires: new Date(Date.now() + 1000 * 60 * 60 * 6),
  });
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("Received image request");
  try {
    const { pathParameters } = event;

    const seedStr = pathParameters.seed;

    const s3Key = `axolotl_metadata/${seedStr}.png`;
    const exists = await s3Exists({ key: s3Key, bucket: seedImageBucket });

    if (!exists) {
      // From seed, generate traits
      const { metadata } = generateTraits(utils.arrayify(seedStr));
      const metadataStr = JSON.stringify(metadata);
      await s3WriteObject(s3Key, metadataStr);
      return {
        statusCode: 200,
        headers: {
          ["Content-Type"]: "application/json",
        },
        body: metadataStr,
      };
    }
    const data = await getFromS3(s3Key);
    return {
      statusCode: 200,
      headers: {
        ["Content-Type"]: "application/json",
      },
      body: data.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: "Oops, something went wrong",
    };
  }
};
