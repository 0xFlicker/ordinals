import { toBitcoinNetworkName } from "@0xflick/ordinals-models";
import fs from "fs";
import type { Tx } from "mempool.js/lib/interfaces/bitcoin/transactions.js";
import { GraphQLClient } from "graphql-request";
import { FundingStatus, getSdk } from "../../graphql.generated.js";
import { createMempoolBitcoinClient } from "../../mempool.js";
import type { ListFundingsQuery } from "../../graphql.generated.js";

export type MalformedOutput = {
  fundingAddress: string;
  fundingAmountSats: number;
  availableFundingAmountSats: number;
  destinationAddress: string;
  txs: Tx[];
};

function pullAllRevealed(sdk: ReturnType<typeof getSdk>, collectionId: string) {
  return sdk.Revealed({
    collectionId,
  });
}

export async function findMalformedFunding({
  collectionId,
  url,
  writeFilePath,
}: {
  collectionId: string;
  url?: string;
  writeFilePath?: string;
}) {
  const client = new GraphQLClient(url ?? "http://localhost:4000");
  const sdk = getSdk(client);
  const response = await sdk.ListFundings({
    query: {
      fundingStatus: FundingStatus.Funding,
      collectionId,
    },
  });
  if (response.inscriptionFundings.problems) {
    throw new Error(response.inscriptionFundings.problems[0].message);
  }

  const fundings = response.inscriptionFundings.fundings;

  if (!fundings) {
    throw new Error("No fundings found");
  }

  const outputs: MalformedOutput[] = [];

  for (const funding of fundings) {
    const bitcoinClient = createMempoolBitcoinClient({
      network: toBitcoinNetworkName(funding.network.toLowerCase()),
    });

    const tx = await bitcoinClient.addresses.getAddressTxs({
      address: funding.fundingAddress,
    });

    // Sum the outputs
    const fundingAmountSats = tx.reduce((acc, t) => {
      return (
        acc +
        t.vout.reduce((acc, o) => {
          return acc + o.value;
        }, 0)
      );
    }, 0);

    if (tx && fundingAmountSats < funding.fundingAmountSats && tx.length > 0) {
      outputs.push({
        fundingAddress: funding.fundingAddress,
        availableFundingAmountSats: fundingAmountSats,
        fundingAmountSats: funding.fundingAmountSats,
        destinationAddress: funding.destinationAddress,
        txs: tx,
      });
    }
  }

  if (writeFilePath) {
    fs.writeFileSync(writeFilePath, JSON.stringify(outputs, null, 2));
  } else {
    console.log(JSON.stringify(outputs, null, 2));
  }

  console.log("Done");
}
