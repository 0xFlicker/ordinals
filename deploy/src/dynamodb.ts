import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import {
  DynamoDBStreamsToLambdaProps,
  DynamoDBStreamsToLambda,
} from "@aws-solutions-constructs/aws-dynamodbstreams-lambda";
import path from "path";
import { fileURLToPath } from "url";
import { parseEnv } from "./utils/files.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface IProps {
  readonly domainName: string;
}

export class DynamoDB extends Construct {
  public readonly walletTable: dynamodb.Table;
  public readonly rbacTable: dynamodb.Table;
  public readonly userNonceTable: dynamodb.Table;
  public readonly fundingTable: dynamodb.Table;
  public readonly claimsTable: dynamodb.Table;
  public readonly openEditionClaimsTable: dynamodb.Table;
  public readonly uploadsTable: dynamodb.Table;
  public readonly batchTable: dynamodb.Table;
  constructor(scope: Construct, id: string, { domainName }: IProps) {
    super(scope, id);

    const walletTable = new dynamodb.Table(this, "WalletTable", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    this.walletTable = walletTable;

    new cdk.CfnOutput(this, "WalletTableName", {
      exportName: "WalletTableName",
      value: walletTable.tableName,
    });

    const rbacTable = new dynamodb.Table(this, "RbacTable", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    rbacTable.addGlobalSecondaryIndex({
      indexName: "RolesByNameIndex",
      partitionKey: {
        name: "RoleName",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["RoleID"],
    });
    rbacTable.addGlobalSecondaryIndex({
      indexName: "RoleByActionResourceIndex",
      partitionKey: {
        name: "ResourceType",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "ActionType",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["RoleID", "Identifier"],
    });
    rbacTable.addGlobalSecondaryIndex({
      indexName: "PermissionRoleIDIndex",
      partitionKey: {
        name: "PermissionRoleID",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "CreatedAt",
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["ActionType", "ResourceType", "Identifier"],
    });
    rbacTable.addGlobalSecondaryIndex({
      indexName: "UserRoleIDIndex",
      partitionKey: {
        name: "UserRoleID",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "CreatedAt",
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["UserID"],
    });
    rbacTable.addGlobalSecondaryIndex({
      indexName: "UserIDIndex",
      partitionKey: {
        name: "UserID",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "CreatedAt",
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["UserRoleID"],
    });
    this.rbacTable = rbacTable;
    new cdk.CfnOutput(this, "RbacTableName", {
      exportName: "RbacTableName",
      value: rbacTable.tableName,
    });

    const userNonceTable = new dynamodb.Table(this, "UserNonce", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "TTL",
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    userNonceTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["Nonce"],
    });
    this.userNonceTable = userNonceTable;
    new cdk.CfnOutput(this, "UserNonceTableName", {
      exportName: "UserNonceTableName",
      value: userNonceTable.tableName,
    });

    // // Create a NodejsFunction for the DynamoDB update funding lambda
    const dynamodbUpdateFundingLambda = new lambdaNodejs.NodejsFunction(
      this,
      "DynamodbUpdateFundingLambdaFunction",
      {
        entry: path.join(
          __dirname,
          "../../apps/functions/src/lambdas/dynamodb-update-funding.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 128,
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
        environment: {
          LOG_LEVEL: "debug",
          NODE_OPTIONS: "--enable-source-maps",
          ...parseEnv(`${domainName}/.env.graphql`),
        },
      },
    );

    // Create the funding table with streams
    const fundingTable = new dynamodb.Table(this, "FundingTable", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Add the Lambda function as a target for the DynamoDB stream
    const stream = fundingTable.tableStreamArn;
    if (stream) {
      new lambda.EventSourceMapping(this, "StreamProcessor", {
        target: dynamodbUpdateFundingLambda,
        eventSourceArn: fundingTable.tableStreamArn,
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 100,
      });
    }

    // Add GSIs to the funding table
    fundingTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    fundingTable.addGlobalSecondaryIndex({
      indexName: "statusNextCheckAtIndex",
      partitionKey: {
        name: "fundingStatus",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "nextCheckAt",
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
        "id",
        "address",
        "fundingAmountSat",
        "network",
        "createdAt",
      ],
    });

    fundingTable.addGlobalSecondaryIndex({
      indexName: "statusFundedAtIndex",
      partitionKey: {
        name: "fundingStatus",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "fundedAt",
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
        "id",
        "address",
        "fundingAmountSat",
        "network",
        "createdAt",
        "fundedAt",
        "sizeEstimate",
        "fundingTxid",
        "fundingVout",
      ],
    });

    fundingTable.addGlobalSecondaryIndex({
      indexName: "collectionByName",
      partitionKey: {
        name: "collectionName",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["collectionID", "maxSupply", "currentSupply"],
    });

    fundingTable.addGlobalSecondaryIndex({
      indexName: "collectionId-index",
      partitionKey: {
        name: "collectionId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "fundingStatus",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["address", "id", "fundingAmountSat"],
    });

    fundingTable.addGlobalSecondaryIndex({
      indexName: "destination-address-collection-index",
      partitionKey: {
        name: "destinationAddress",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "collectionId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    fundingTable.addGlobalSecondaryIndex({
      indexName: "farcasterFid-index",
      partitionKey: {
        name: "farcasterFid",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    fundingTable.addGlobalSecondaryIndex({
      indexName: "batchId-index",
      partitionKey: {
        name: "batchId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["id"],
    });

    fundingTable.addGlobalSecondaryIndex({
      indexName: "creatorUserId-index",
      partitionKey: {
        name: "creatorUserId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.fundingTable = fundingTable;
    new cdk.CfnOutput(this, "FundingTableName", {
      exportName: "FundingTableName",
      value: fundingTable.tableName,
    });

    new cdk.CfnOutput(this, "FundingTableStreamArn", {
      exportName: "FundingTableStreamArn",
      value: fundingTable.tableStreamArn ?? "null",
    });

    // Grant permissions to the Lambda function to read from the DynamoDB stream
    fundingTable.grantStreamRead(dynamodbUpdateFundingLambda);

    const claimsTable = new dynamodb.Table(this, "Claims", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Not used for now
    // claimsTable.addGlobalSecondaryIndex({
    //   indexName: "GSI1",
    //   partitionKey: {
    //     name: "sk",
    //     type: dynamodb.AttributeType.STRING,
    //   },
    //   projectionType: dynamodb.ProjectionType.ALL,
    // });

    claimsTable.addGlobalSecondaryIndex({
      indexName: "ClaimsByAddress",
      partitionKey: {
        name: "ClaimedAddress",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    claimsTable.addGlobalSecondaryIndex({
      indexName: "ClaimsByCollectionAddress",
      partitionKey: {
        name: "ClaimedAddressCollection",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    claimsTable.addGlobalSecondaryIndex({
      indexName: "ObservedBlockHeight-index",
      partitionKey: {
        name: "ObservedBlockHeight",
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    claimsTable.addGlobalSecondaryIndex({
      indexName: "ClaimsByCollection",
      partitionKey: {
        name: "CollectionId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.claimsTable = claimsTable;
    new cdk.CfnOutput(this, "ClaimsTableName", {
      exportName: "ClaimsTableName",
      value: claimsTable.tableName,
    });

    const openEditionClaimsTable = new dynamodb.Table(
      this,
      "OpenEditionClaims",
      {
        partitionKey: {
          name: "pk",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "sk",
          type: dynamodb.AttributeType.STRING,
        },
        tableClass: dynamodb.TableClass.STANDARD,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      },
    );

    openEditionClaimsTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: {
        name: "gsi1pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.openEditionClaimsTable = openEditionClaimsTable;
    new cdk.CfnOutput(this, "OpenEditionClaimsTableName", {
      exportName: "OpenEditionClaimsTableName",
      value: openEditionClaimsTable.tableName,
    });

    const batchTable = new dynamodb.Table(this, "Batch", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "TTL",
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.batchTable = batchTable;
    new cdk.CfnOutput(this, "BatchTableName", {
      exportName: "BatchTableName",
      value: batchTable.tableName,
    });

    const uploadsTable = new dynamodb.Table(this, "Uploads", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "TTL",
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.uploadsTable = uploadsTable;
    new cdk.CfnOutput(this, "UploadsTableName", {
      exportName: "UploadsTableName",
      value: uploadsTable.tableName,
    });
  }
}
