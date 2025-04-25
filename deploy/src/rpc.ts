import { Construct } from "constructs";
import { parse } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { textFromSecret } from "./utils/files.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BitcoinRpcFunctionProps {
  readonly domainName: string;
}

export class BitcoinRpcFunction extends Construct {
  public readonly rpcLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: BitcoinRpcFunctionProps) {
    super(scope, id);

    const rpcLambda = new lambdaNodejs.NodejsFunction(this, "RpcLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(5),

      memorySize: 128,
      handler: "handler",
      entry: path.join(
        __dirname,
        "../../apps/functions/src/lambdas/bitcoin.ts",
      ),
      environment: {
        LOG_LEVEL: "debug",
        NODE_OPTIONS: "--enable-source-maps",
        ...parse(textFromSecret(`${props.domainName}/.env.rpc`)),
      },
      bundling: {
        externalModules: ["aws-sdk", "@aws-sdk/*", "dtrace-provider"],
        sourceMap: true,
        minify: true,
        sourcesContent: true,
        inject: [path.join(__dirname, "./esbuild/cjs-shim.ts")],
        format: lambdaNodejs.OutputFormat.ESM,
        target: "node20",
        platform: "node",
      },
    });

    this.rpcLambda = rpcLambda;
  }
}
