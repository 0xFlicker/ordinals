import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Table,
  AttributeType,
  BillingMode,
  ProjectionType,
} from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";

export class SocialFeedStack extends Construct {
  public readonly table: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new Table(this, "Table", {
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Global feed index: query all inscriptions by createdAt
    this.table.addGlobalSecondaryIndex({
      indexName: "GlobalFeedIndex",
      partitionKey: { name: "GSI1PK", type: AttributeType.STRING }, // always "INSCRIPTIONS"
      sortKey: { name: "GSI1SK", type: AttributeType.STRING }, // ISO timestamp
      projectionType: ProjectionType.ALL,
    });

    // Per-creator feed: query a single creator’s inscriptions by createdAt
    this.table.addGlobalSecondaryIndex({
      indexName: "CreatorFeedIndex",
      partitionKey: { name: "GSI2PK", type: AttributeType.STRING }, // the creatorId
      sortKey: { name: "GSI2SK", type: AttributeType.STRING }, // ISO timestamp
      projectionType: ProjectionType.ALL,
    });

    new cdk.CfnOutput(this, "Name", {
      exportName: `${id}Name`,
      value: this.table.tableName,
    });
  }
}
