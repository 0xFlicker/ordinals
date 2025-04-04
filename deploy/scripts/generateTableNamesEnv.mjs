import fs from "fs";
const outputs = JSON.parse(
  await fs.promises.readFile("./outputs.json", "utf8"),
);

const tableNames = {};
let inscriptionBucketName;
let uploadBucketName;
let fundingTableStreamArn;
let parentInscriptionSecKeyEnvelopeKeyId;
let fundingSecKeyEnvelopeKeyId;
for (const [key, value] of Object.entries(outputs["ordinals"])) {
  if (key.startsWith("DynamoDBRbacTableName")) {
    tableNames.rbac = value;
  } else if (key.startsWith("DynamoDBUserNonceTable")) {
    tableNames.userNonce = value;
  } else if (key.startsWith("DynamoDBFundingTableName")) {
    tableNames.funding = value;
  } else if (key.startsWith("DynamoDBClaimsTableName")) {
    tableNames.claims = value;
  } else if (key.startsWith("DynamoDBOpenEditionClaimsTableName")) {
    tableNames.openEditionClaims = value;
  } else if (key.startsWith("DynamoDBWalletTableName")) {
    tableNames.wallet = value;
  } else if (key.startsWith("DynamoDBUploadsTableName")) {
    tableNames.uploads = value;
  } else if (key.startsWith("StorageinscriptionsBucketName")) {
    inscriptionBucketName = value;
  } else if (key.startsWith("DynamoDBFundingTableStreamArn")) {
    fundingTableStreamArn = value;
  } else if (key.startsWith("UploadBucketuploadsBucketName")) {
    uploadBucketName = value;
  } else if (key.startsWith("ParentInscriptionSecKeyEnvelopeKeyId")) {
    parentInscriptionSecKeyEnvelopeKeyId = value;
  } else if (key.startsWith("FundingSecKeyEnvelopeKeyId")) {
    fundingSecKeyEnvelopeKeyId = value;
  }
}

console.log(`TABLE_NAMES=${JSON.stringify(tableNames)}`);
console.log(`FUNDING_TABLE_STREAM_ARN=${fundingTableStreamArn}`);
console.log(`INSCRIPTION_BUCKET=${inscriptionBucketName}`);
console.log(`UPLOAD_BUCKET=${uploadBucketName}`);
// Check if ../apps/graphql-backend/.env exists
// If it does, then add or replace the TABLE_NAMES and INSCRIPTION_BUCKET lines
// otherwise ignore
const envPaths = [
  "../apps/graphql-backend/.env",
  "../apps/cli/.env",
  "../apps/workers/.env",
];

for (const envPath of envPaths) {
  try {
    fs.accessSync(envPath, fs.constants.F_OK);
    // file exists
    const envFile = await fs.promises.readFile(envPath, "utf8");
    const lines = envFile.split("\n");
    const newLines = [];
    let foundTableNames = false;
    let foundInscriptionBucket = false;
    let foundFundingTableStreamArn = false;
    let foundUploadBucket = false;
    let foundParentInscriptionSecKeyEnvelopeKeyId = false;
    let foundFundingSecKeyEnvelopeKeyId = false;
    for (const line of lines) {
      if (line.startsWith("TABLE_NAMES=")) {
        newLines.push(`TABLE_NAMES=${JSON.stringify(tableNames)}`);
        foundTableNames = true;
      } else if (line.startsWith("INSCRIPTION_BUCKET=")) {
        newLines.push(`INSCRIPTION_BUCKET=${inscriptionBucketName}`);
        foundInscriptionBucket = true;
      } else if (line.startsWith("FUNDING_TABLE_STREAM_ARN=")) {
        newLines.push(`FUNDING_TABLE_STREAM_ARN=${fundingTableStreamArn}`);
        foundFundingTableStreamArn = true;
      } else if (line.startsWith("UPLOAD_BUCKET=")) {
        newLines.push(`UPLOAD_BUCKET=${uploadBucketName}`);
        foundUploadBucket = true;
      } else if (
        line.startsWith("PARENT_INSCRIPTION_SEC_KEY_ENVELOPE_KEY_ID=")
      ) {
        newLines.push(
          `PARENT_INSCRIPTION_SEC_KEY_ENVELOPE_KEY_ID=${parentInscriptionSecKeyEnvelopeKeyId}`,
        );
        foundParentInscriptionSecKeyEnvelopeKeyId = true;
      } else if (line.startsWith("FUNDING_SEC_KEY_ENVELOPE_KEY_ID=")) {
        newLines.push(
          `FUNDING_SEC_KEY_ENVELOPE_KEY_ID=${fundingSecKeyEnvelopeKeyId}`,
        );
        foundFundingSecKeyEnvelopeKeyId = true;
      } else {
        newLines.push(line);
      }
    }
    if (!foundTableNames) {
      newLines.push(`TABLE_NAMES=${JSON.stringify(tableNames)}`);
    }
    if (!foundInscriptionBucket) {
      newLines.push(`INSCRIPTION_BUCKET=${inscriptionBucketName}`);
    }
    if (!foundFundingTableStreamArn) {
      newLines.push(`FUNDING_TABLE_STREAM_ARN=${fundingTableStreamArn}`);
    }
    if (!foundUploadBucket) {
      newLines.push(`UPLOAD_BUCKET=${uploadBucketName}`);
    }
    if (!foundParentInscriptionSecKeyEnvelopeKeyId) {
      newLines.push(
        `PARENT_INSCRIPTION_SEC_KEY_ENVELOPE_KEY_ID=${parentInscriptionSecKeyEnvelopeKeyId}`,
      );
    }
    if (!foundFundingSecKeyEnvelopeKeyId) {
      newLines.push(
        `FUNDING_SEC_KEY_ENVELOPE_KEY_ID=${fundingSecKeyEnvelopeKeyId}`,
      );
    }
    await fs.promises.writeFile(envPath, newLines.join("\n"));
    console.log(`Updated ${envPath}`);
  } catch (err) {
    // file does not exist
  }
}
