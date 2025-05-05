import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class RbacTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, id, {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "RolesByNameIndex",
      partitionKey: { name: "RoleName", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["RoleID"],
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "RoleByActionResourceIndex",
      partitionKey: { name: "ResourceType", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "ActionType", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["RoleID", "Identifier"],
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "PermissionRoleIDIndex",
      partitionKey: { name: "PermissionRoleID", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "CreatedAt", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["ActionType", "ResourceType", "Identifier"],
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "UserRoleIDIndex",
      partitionKey: { name: "UserRoleID", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "CreatedAt", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["UserID"],
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "UserIDIndex",
      partitionKey: { name: "UserID", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "CreatedAt", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["UserRoleID"],
    });

    new cdk.CfnOutput(this, 'Name', {
      exportName: `${id}Name`,
      value: this.table.tableName,
    });
  }
}
