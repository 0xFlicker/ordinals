import { GraphQLClient } from "graphql-request";
import { getSdk } from "../../graphql.generated.js";
import { ID_Collection } from "@0xflick/ordinals-models";

function createClient(endpoint: string, requestConfig?: any): GraphQLClient {
  return new GraphQLClient(endpoint, requestConfig);
}

export async function collectionCreate({
  name,
  keyValues,
  url,
  token,
}: {
  name: string;
  keyValues: [string, string][];
  url: string;
  token: string | null;
}) {
  const client = createClient(
    url,
    token && {
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  );
  const sdk = getSdk(client);
  const {
    createCollection: { id: collectionId },
  } = await sdk.CreateCollection({
    input: {
      name,
    },
  });

  console.log(`Collection ID: ${collectionId}`);

  if (keyValues.length > 0) {
    console.log("Setting metadata...");
    await sdk.UpdateMetadata({
      id: collectionId,
      metadata: keyValues.map(([key, value]) => ({
        key,
        value,
      })),
    });
  }
  console.log("Done!");
  return collectionId as ID_Collection;
}
