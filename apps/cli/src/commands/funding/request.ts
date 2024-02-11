import { GraphQLClient } from "graphql-request";
import {
  getSdk,
  AxolotlClaimRequest,
  AxolotlOpenEditionRequest,
} from "../../graphql.generated.js";
import { RequestConfig } from "graphql-request/build/esm/types.js";

function createClient(
  endpoint: string,
  requestConfig?: RequestConfig,
): GraphQLClient {
  return new GraphQLClient(endpoint, requestConfig);
}

export async function fundingRequest({
  request,
  url,
  token,
}: {
  request: AxolotlOpenEditionRequest;
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
  const { axolotlFundingOpenEditionRequest } = await sdk.AxolotlFundingRequest({
    request,
  });
  if (!axolotlFundingOpenEditionRequest.data) {
    throw new Error("No funding request data");
  }

  console.log(
    `Funding address: ${axolotlFundingOpenEditionRequest.data.inscriptionFunding.fundingAddress}`,
  );
  console.log(
    `Funding amount BTC: ${axolotlFundingOpenEditionRequest.data.inscriptionFunding.fundingAmountBtc}`,
  );
  console.log(
    `Funding amount sats: ${axolotlFundingOpenEditionRequest.data.inscriptionFunding.fundingAmountSats}`,
  );
  console.log(
    `Funding address ID: ${axolotlFundingOpenEditionRequest.data.inscriptionFunding.id}`,
  );

  return axolotlFundingOpenEditionRequest.data;
}
