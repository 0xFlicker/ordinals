import "dotenv/config";
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ID_AddressInscription } from "../../models/src";
import { createDynamoDbFundingDao } from "@0xflick/ordinals-backend";

describe("genesis", () => {
  it("should create a db", async () => {
    const db = new DynamoDBClient({
      region: "us-east-1",
      endpoint: "http://localhost:8000",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });
    const client = DynamoDBDocumentClient.from(db, {
      marshallOptions: {
        convertEmptyValues: true,
      },
    });
    // await client.send(
    //   new CreateTableCommand({
    //     TableName: "Funding",
    //     KeySchema: [{ AttributeName: "pk", KeyType: "HASH" as const }],
    //     AttributeDefinitions: [
    //       { AttributeName: "pk", AttributeType: "S" as const },
    //     ],
    //     BillingMode: "PAY_PER_REQUEST" as const,
    //   }),
    // );
    await client.send(
      new PutCommand({
        TableName: "Funding",
        Item: {
          pk: "1" as ID_AddressInscription,
          address: "1234567890",
          destinationAddress: "1234567890",
          fundingAmountBtc: "1000",
          fundingAmountSat: 1000,
          fundingStatus: "funding",
        },
      }),
    );
    // const fundingDao = createDynamoDbFundingDao();
    // expect(fundingDao).toBeDefined();
    // await fundingDao.createFunding({
    //   id: "1" as ID_AddressInscription,
    //   address: "1234567890",
    //   destinationAddress: "1234567890",
    //   fundingAmountBtc: "1000",
    //   fundingAmountSat: 1000,
    //   createdAt: new Date(),
    //   fundingStatus: "funding",
    //   network: "regtest",
    //   timesChecked: 0,
    //   sizeEstimate: 1000,
    //   type: "address-inscription",
    //   meta: {},
    // });
    // const funding = await fundingDao.getFunding("1" as ID_AddressInscription);
    // expect(funding).toBeDefined();
    // expect(funding?.id).toBe("1" as ID_AddressInscription);
  });
});
