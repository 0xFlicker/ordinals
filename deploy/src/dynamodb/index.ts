import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { WalletTable } from "./wallet-table.js";
import { UsersTable } from "./users-table.js";
import { RbacTable } from "./rbac-table.js";
import { UserNonceTable } from "./user-nonce-table.js";
import { FundingTable } from "./funding-table.js";
import { ClaimsTable } from "./claims-table.js";
import { OpenEditionClaimsTable } from "./open-edition-claims-table.js";
import { BatchTable } from "./batch-table.js";
import { UploadsTable } from "./uploads-table.js";
import { SocialFeedStack } from "./socials-table.js";
export interface IProps {
  readonly domainName: string;
}

export class DynamoDB extends Construct {
  public readonly walletTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly rbacTable: dynamodb.Table;
  public readonly userNonceTable: dynamodb.Table;
  public readonly fundingTable: dynamodb.Table;
  public readonly claimsTable: dynamodb.Table;
  public readonly openEditionClaimsTable: dynamodb.Table;
  public readonly batchTable: dynamodb.Table;
  public readonly uploadsTable: dynamodb.Table;
  public readonly socialsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const wallet = new WalletTable(this, "Wallet");
    this.walletTable = wallet.table;

    const users = new UsersTable(this, "Users");
    this.usersTable = users.table;

    const rbac = new RbacTable(this, "Rbac");
    this.rbacTable = rbac.table;

    const userNonce = new UserNonceTable(this, "UserNonce");
    this.userNonceTable = userNonce.table;

    const funding = new FundingTable(this, "Funding", {
      domainName: props.domainName,
    });
    this.fundingTable = funding.table;

    const claims = new ClaimsTable(this, "Claims");
    this.claimsTable = claims.table;

    const openEdition = new OpenEditionClaimsTable(
      this,
      "OpenEditionClaimsTable",
    );
    this.openEditionClaimsTable = openEdition.table;

    const batch = new BatchTable(this, "Batch");
    this.batchTable = batch.table;

    const uploads = new UploadsTable(this, "Uploads");
    this.uploadsTable = uploads.table;

    const socials = new SocialFeedStack(this, "Socials");
    this.socialsTable = socials.table;
  }
}
