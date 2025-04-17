// I don't think this does anything. Probably was trying to work on a tx unsticker
import { catchError, from, mergeMap, tap, filter, map, EMPTY } from "rxjs";
import { FundingDao, MempoolClient, createLogger } from "../index.js";
import { BitcoinNetworkNames, ID_Collection } from "@0xflick/ordinals-models";
import { Address } from "@cmdcode/tapscript";
import { NoVoutFound, enqueueCheckTxo } from "./mempool.js";

const logger = createLogger({ name: "watch/resolve" });

/*
 * Periodically fetches all fundings that we are waiting for the user to fund
 * using the "lastChecked" and "timeChecked" field, we implement a backoff stategy to avoid
 * needing to endlessly check stale fundings.
 *
 * Not currently expiring fundings, but we could do that in the future.
 *
 */
export function checkFunding({
  collectionId,
  fundingDao,
  mempoolBitcoinClient,
  concurrency = 12,
  network = "testnet",
}: {
  collectionId: ID_Collection;
  fundingDao: FundingDao;
  mempoolBitcoinClient: MempoolClient["bitcoin"];
  concurrency: number;
  network?: BitcoinNetworkNames;
}) {
  logger.trace(`Watching for fundings for collection ${collectionId}`);
  return from(
    fundingDao.listAllFundingsByStatusAndCollection({
      id: collectionId,
      fundingStatus: "funding",
    }),
  ).pipe(
    filter((funding) => {
      const n = Address.decode(funding.address).network;
      if (n === "main" && network === "mainnet") return true;
      if (n === network) return true;
      return false;
    }),
    tap((funding) => {
      logger.trace(
        `Starting to watch funding ${funding.id} for address ${funding.address} `,
      );
    }),
    mergeMap((funding) => {
      return from(
        enqueueCheckTxo({
          address: funding.address,
          mempoolBitcoinClient,
        }),
      ).pipe(
        map((mempoolResponse) => {
          if (!mempoolResponse)
            throw new NoVoutFound({ address: funding.address });
          return {
            ...funding,
            ...mempoolResponse,
          };
        }),
        map(async (funding) => {
          try {
            logger.info(
              `Funding ${funding.id} for ${funding.address} found!  Paid ${funding.amount} for a request of: ${funding.fundingAmountSat}`,
            );
            if (funding.amount < funding.fundingAmountSat) {
              logger.warn(
                `Funding ${funding.id} for ${funding.address} is underfunded`,
              );
            } else {
              await fundingDao.addressFunded({
                fundingTxid: funding.txid,
                fundingVout: funding.vout,
                id: funding.id,
              });
              await fundingDao.updateFundingLastChecked({
                id: funding.id,
                lastChecked: new Date(),
                resetTimesChecked: true,
              });
            }
          } catch (error) {
            logger.error(
              error,
              "Error updating address funded for",
              funding.address,
            );
          }
        }),
        catchError((error) => {
          if (error instanceof NoVoutFound) {
            return EMPTY;
          }
          logger.error(error, "Error checking funding for", funding.address);
          return EMPTY;
        }),
      );
    }, concurrency),
  );
}
