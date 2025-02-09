import * as cdk from "aws-cdk-lib";
import { buildSync } from "esbuild";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  DynamoDBStreamsToLambdaProps,
  DynamoDBStreamsToLambda,
} from "@aws-solutions-constructs/aws-dynamodbstreams-lambda";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function compileDynamodbUpdateFunding() {
  const outfile = path.join(
    cdk.FileSystem.mkdtemp("dynamodb-update-funding"),
    "index.mjs",
  );
  buildSync({
    entryPoints: [
      path.join(
        __dirname,
        "../../apps/functions/src/lambdas/dynamodb-update-funding.ts",
      ),
    ],
    outfile,
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    external: ["aws-sdk", "@aws-sdk/*"],
    inject: [path.join(__dirname, "./esbuild/cjs-shim.ts")],
    sourcemap: true,
  });
  const finalDir = path.dirname(outfile);
  return finalDir;
}

function compileFundingPoller() {
  const outfile = path.join(
    cdk.FileSystem.mkdtemp("funding-queue"),
    "index.mjs",
  );
  buildSync({
    entryPoints: [
      path.join(__dirname, "../../apps/functions/src/lambdas/funding-queue.ts"),
    ],
    outfile,
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    external: ["aws-sdk", "@aws-sdk/*"],
    inject: [path.join(__dirname, "./esbuild/cjs-shim.ts")],
    sourcemap: true,
  });
  const finalDir = path.dirname(outfile);
  return finalDir;
}

export interface IProps {}

export class DynamoDB extends Construct {
  public readonly rbacTable: dynamodb.Table;
  public readonly userNonceTable: dynamodb.Table;
  public readonly fundingTable: dynamodb.Table;
  public readonly claimsTable: dynamodb.Table;
  public readonly openEditionClaimsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, _: IProps) {
    super(scope, id);

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
      nonKeyAttributes: ["Address"],
    });
    rbacTable.addGlobalSecondaryIndex({
      indexName: "AddressIndex",
      partitionKey: {
        name: "Address",
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

    const dynamodbUpdateFundingCodeDir = compileDynamodbUpdateFunding();
    const fundingTableWithStreams = new DynamoDBStreamsToLambda(
      this,
      "DynamodbUpdateFundingLambda",
      {
        lambdaFunctionProps: {
          runtime: lambda.Runtime.NODEJS_20_X,
          code: lambda.Code.fromAsset(dynamodbUpdateFundingCodeDir),
          handler: "index.handler",
        },
        dynamoTableProps: {
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
        },
      },
    );

    const fundingTable = fundingTableWithStreams.dynamoTable;

    fundingTable?.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    fundingTable?.addGlobalSecondaryIndex({
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

    fundingTable?.addGlobalSecondaryIndex({
      indexName: "collectionByName",
      partitionKey: {
        name: "collectionName",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["collectionID", "maxSupply", "currentSupply"],
    });
    fundingTable?.addGlobalSecondaryIndex({
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
    fundingTable?.addGlobalSecondaryIndex({
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
    fundingTable?.addGlobalSecondaryIndex({
      indexName: "farcasterFid-index",
      partitionKey: {
        name: "farcasterFid",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.fundingTable = fundingTable!;
    new cdk.CfnOutput(this, "FundingTableName", {
      exportName: "FundingTableName",
      value: fundingTable?.tableName ?? "null",
    });

    new cdk.CfnOutput(this, "FundingTableStreamArn", {
      exportName: "FundingTableStreamArn",
      value: fundingTable?.tableStreamArn ?? "null",
    });

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

    const fundingPollCodeDir = compileFundingPoller();
    const fundingPollLambda = new lambda.Function(this, "FundingPollLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(fundingPollCodeDir),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        LOG_LEVEL: "debug",
        TABLE_NAMES: JSON.stringify({
          rbac: rbacTable.tableName,
          userNonce: userNonceTable.tableName,
          funding: fundingTable?.tableName ?? "null",
          claims: claimsTable.tableName,
          openEditionClaims: openEditionClaimsTable.tableName,
        }),
        EVENT_BUS_NAME: "default",
      },
    });
    fundingTable?.grantReadWriteData(fundingPollLambda);
    const rule = new events.Rule(this, "FundingPollScheduleRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
    });
    rule.addTarget(new targets.LambdaFunction(fundingPollLambda));
  }
}
