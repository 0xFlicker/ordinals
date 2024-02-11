import { GetObjectCommand, S3 } from "@aws-sdk/client-s3";
import { Canvas, Image, loadImage } from "canvas";
import { operations } from "@0xflick/ordinals-axolotl-valley-render";
import { ILayer } from "@0xflick/assets";
import { utils } from "ethers";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { Readable } from "stream";

const s3 = new S3({
  region: "us-east-1",
});

if (!process.env.ASSET_BUCKET) {
  throw new Error("ASSET_BUCKET not set");
}
if (!process.env.SEED_BUCKET) {
  throw new Error("SEED_BUCKET not set");
}

const generativeAssetsBucket = process.env.ASSET_BUCKET;
const seedImageBucket = process.env.SEED_BUCKET;

async function renderCanvas(canvas: Canvas, layers: ILayer[]) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const layer of [...layers].sort((a, b) => a.zIndex - b.zIndex)) {
    await layer.draw(ctx as any);
  }
}

async function getImageFromS3(key: string): Promise<Buffer> {
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

async function s3WriteObject(key: string, imageData: Buffer): Promise<void> {
  console.log(`Writing to s3://${seedImageBucket}/${key}`);

  await s3.putObject({
    Bucket: seedImageBucket,
    Key: key,
    Body: imageData,
    ContentDisposition: "inline",
    ContentType: "image/png",
    Expires: new Date(Date.now() + 1000 * 60 * 60 * 6),
  });
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("Received image request");
  try {
    const { pathParameters } = event;

    const seedStr = pathParameters.seed;
    console.log(`Seed: ${seedStr}`);

    const s3Key = `axolotl_preview/${seedStr}.png`;
    const exists = await s3Exists({ key: s3Key, bucket: seedImageBucket });

    if (!exists) {
      console.log(`Seed image not found in S3: ${s3Key}`);
      // From seed, generate layers
      const { layers } = await operations(
        utils.arrayify(seedStr),
        async (imagePath) => {
          const getObjectCommand = new GetObjectCommand({
            Bucket: generativeAssetsBucket,
            Key: imagePath.replace(".webp", ".PNG"),
          });

          try {
            const response = await s3.send(getObjectCommand);
            const stream = response.Body as Readable;
            return new Promise<Image>((resolve, reject) => {
              const responseDataChunks: Buffer[] = [];

              // Handle an error while streaming the response body
              stream.once("error", (err) => reject(err));

              // Attach a 'data' listener to add the chunks of data to our array
              // Each chunk is a Buffer instance
              stream.on("data", (chunk) => responseDataChunks.push(chunk));

              // Once the stream has no more data, join the chunks into a string and return the string
              stream.once("end", () => {
                resolve(loadImage(Buffer.concat(responseDataChunks)));
              });
            });
          } catch (err) {
            console.error(`Unable to fetch image ${imagePath}`, err);
            throw err;
          }
        },
      );

      // Render canvas
      const canvas = new Canvas(569, 569);
      await renderCanvas(canvas, layers);

      // Save canvas to S3
      console.log("Fetching image from canvas");
      const imageData = canvas.toBuffer("image/png", {
        compressionLevel: 8,
      });
      // console.log("Saving canvas to S3");
      await s3WriteObject(s3Key, imageData);
      // console.log("Done");
      return {
        statusCode: 200,
        headers: {
          ["Content-Type"]: "image/png",
        },
        body: imageData.toString("base64"),
        isBase64Encoded: true,
      };
    }
    const imageData = await getImageFromS3(s3Key);
    return {
      statusCode: 200,
      headers: {
        ["Content-Type"]: "image/png",
      },
      body: imageData.toString("base64"),
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
