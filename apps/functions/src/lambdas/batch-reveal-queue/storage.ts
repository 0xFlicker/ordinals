import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export async function uploadTransaction(
  s3Client: S3Client,
  bucketName: string,
  txid: string,
  transactionHex: string,
) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: txid,
    Body: transactionHex,
  });
  return await s3Client.send(command);
}
