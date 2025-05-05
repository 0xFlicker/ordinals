import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class ClaimsTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, id, {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "ClaimsByAddress",
      partitionKey: { name: "ClaimedAddress", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "ClaimsByCollectionAddress",
      partitionKey: { name: "ClaimedAddressCollection", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "ObservedBlockHeight-index",
      partitionKey: { name: "ObservedBlockHeight", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "ClaimsByCollection",
      partitionKey: { name: "CollectionId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    new cdk.CfnOutput(this, 'Name', {
      exportName: `${id}Name`,
      value: this.table.tableName,
    });
  }
}
