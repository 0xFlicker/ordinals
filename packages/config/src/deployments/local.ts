import { IAwsConfig } from "../types.js";

// localstack
export const awsConfig: IAwsConfig = {
  name: "localstack",
  accessKeyId: "test",
  endpoint: "http://localhost.localstack.cloud:4566",
  region: "us-east-1",
  secretAccessKey: "test",
};
