import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import path from "path";
import { fileURLToPath } from "url";

export interface FundingTableProps {
  readonly domainName: string;
  readonly sopsLayer: lambda.LayerVersion;
}

export class FundingTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: FundingTableProps) {
    super(scope, id);
    const { domainName } = props;

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // Create secret layer for .env.graphql (dynamic based on domainName)
    const secretsDir = path.join(__dirname, "../../../secrets", domainName);
    const graphqlSecretLayer = new lambda.LayerVersion(
      this,
      "DdbFundingSecretLayer",
      {
        code: lambda.Code.fromAsset(secretsDir, {
          exclude: ["*", "!.env.graphql"],
        }),
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        compatibleArchitectures: [lambda.Architecture.ARM_64],
        description: "Layer containing the encrypted .env.graphql file",
      },
    );
    const dynamodbUpdateFundingLambda = new lambdaNodejs.NodejsFunction(
      this,
      "DynamodbUpdateFundingLambdaFunction",
      {
        entry: path.join(
          __dirname,
          "../../../apps/functions/src/lambdas/dynamodb-update-funding/handler.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 128,
        bundling: {
          externalModules: ["aws-sdk", "@aws-sdk/*", "dtrace-provider"],
          sourceMap: true,
          minify: true,
          sourcesContent: true,
          inject: [path.join(__dirname, "../esbuild/cjs-shim.ts")],
          format: lambdaNodejs.OutputFormat.ESM,
          target: "node20",
          platform: "node",
        },
        environment: {
          LOG_LEVEL: "debug",
          NODE_OPTIONS: "--enable-source-maps",
        },
        layers: [props.sopsLayer, graphqlSecretLayer],
      },
    );

    this.table = new dynamodb.Table(this, id, {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    const streamArn = this.table.tableStreamArn;
    if (streamArn) {
      new lambda.EventSourceMapping(this, "StreamProcessor", {
        target: dynamodbUpdateFundingLambda,
        eventSourceArn: streamArn,
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 100,
      });
    }

    this.table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "statusNextCheckAtIndex",
      partitionKey: {
        name: "fundingStatus",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "nextCheckAt", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
        "id",
        "address",
        "fundingAmountSat",
        "network",
        "createdAt",
        "genesisScriptHash",
        "creatorId",
      ],
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "statusFundedAtIndex",
      partitionKey: {
        name: "fundingStatus",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "fundedAt", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
        "id",
        "address",
        "fundingAmountSat",
        "network",
        "createdAt",
        "fundedAt",
        "creatorId",
        "sizeEstimate",
        "fundingTxid",
        "fundingVout",
      ],
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "collectionByName",
      partitionKey: {
        name: "collectionName",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["collectionID", "maxSupply", "currentSupply"],
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "collectionId-index",
      partitionKey: {
        name: "collectionId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "fundingStatus", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["address", "id", "fundingAmountSat"],
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "destination-address-collection-index",
      partitionKey: {
        name: "destinationAddress",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "collectionId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "farcasterFid-index",
      partitionKey: {
        name: "farcasterFid",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "batchId-index",
      partitionKey: { name: "batchId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["id"],
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "creatorUserId-index",
      partitionKey: {
        name: "creatorUserId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["id"],
    });

    new cdk.CfnOutput(this, "Name", {
      exportName: `${id}Name`,
      value: this.table.tableName,
    });

    new cdk.CfnOutput(this, "StreamArn", {
      exportName: `${id}StreamArn`,
      value: this.table.tableStreamArn ?? "null",
    });

    this.table.grantStreamRead(dynamodbUpdateFundingLambda);
  }
}
