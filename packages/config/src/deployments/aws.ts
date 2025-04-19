import type { IAwsConfig } from "../types.js";

const region = process.env.AWS_REGION ?? "us-east-1";

export const awsConfig: IAwsConfig = {
  name: "aws",
  region,
};
