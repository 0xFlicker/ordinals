import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";

export interface FundingTableProps {
  readonly domainName: string;
  readonly sopsLayer: lambda.LayerVersion;
}

export class FundingTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: FundingTableProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, id, {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

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
  }
}
