import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class UploadsTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, id, {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: "TTL",
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new cdk.CfnOutput(this, 'Name', {
      exportName: `${id}Name`,
      value: this.table.tableName,
    });
  }
}