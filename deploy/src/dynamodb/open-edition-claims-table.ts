import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class OpenEditionClaimsTable extends Construct {
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
      indexName: "GSI1",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    new cdk.CfnOutput(this, 'Name', {
      exportName: `${id}Name`,
      value: this.table.tableName,
    });
  }
}
