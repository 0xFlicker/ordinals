if (!process.env.FUNDING_TABLE_STREAM_ARN) {
  throw new Error("FUNDING_TABLE_STREAM_ARN is not set");
}
if (process.env.FUNDING_TABLE_STREAM_ARN === "null") {
  throw new Error("FUNDING_TABLE_STREAM_ARN is null");
}
export const fundingStreamArn = process.env.FUNDING_TABLE_STREAM_ARN;

export const fundingStreamRegion = process.env.FUNDING_STREAM_REGION;

if (!process.env.UPLOAD_BUCKET) {
  throw new Error("UPLOAD_BUCKET is not set");
}
export const uploadBucketName = process.env.UPLOAD_BUCKET;
