import {
  Subject,
  from,
  interval,
  mergeMap,
  retry,
  switchMap,
  takeUntil,
  tap,
  startWith,
  timer,
  map,
  delay,
  catchError,
  EMPTY,
} from "rxjs";
import { SecretKey } from "@0xflick/crypto-utils";
import { IFundingDao, IFundingDocDao } from "../dao/funding.js";
import { MempoolClient, createLogger } from "../index.js";
import {
  ID_AddressInscription,
  ID_Collection,
  TFundingStatus,
} from "@0xflick/ordinals-models";
import { generateRevealTransaction } from "@0xflick/inscriptions";
import { enqueueCheckTxo } from "./mempool.js";

const logger = createLogger({ name: "watch/reveal" });

function customBackoff(retries: number) {
  if (retries < 10) return 3000;
  if (retries < 20) return 5 * 1000;
  if (retries < 30) return 60 * 1000;
  if (retries < 40) return 5 * 60 * 1000;
  if (retries < 50) return 10 * 60 * 1000;
  return 60 * 60 * 1000;
}

/*
 * Periodically fetches all fundings that we are waiting for the user to fund
 * using the "lastChecked" and "timeChecked" field, we implement a backoff stategy to avoid
 * needing to endlessly check stale fundings.
 *
 * Not currently expiring fundings, but we could do that in the future.
 *
 */
export function watchForGenesis(
  {
    collectionId,
    fundingDao,
    fundingDocDao,
    mempoolBitcoinClient,
    pollInterval = 60000,
  }: {
    collectionId: ID_Collection;
    fundingDao: IFundingDao;
    fundingDocDao: IFundingDocDao;
    mempoolBitcoinClient: MempoolClient["bitcoin"];
    pollInterval?: number;
  },
  notifier?: (genesis: {
    address: string;
    network: string;
    id: ID_AddressInscription;
    collectionId?: ID_Collection | undefined;
    contentIds: string[];
    fundingTxid?: string | undefined;
    fundingVout?: number | undefined;
    revealTxids?: string[] | undefined;
    genesisTxid?: string | undefined;
    fundingStatus: TFundingStatus;
    lastChecked?: Date | undefined;
    timesChecked: number;
    fundingAmountBtc: string;
    fundingAmountSat: number;
    meta: {};
  }) => void,
) {
  logger.info(`Watching for funded genesis for collection ${collectionId}`);

  // Use a Subject as a notifier to cancel all ongoing observables when needed.
  const stop$ = new Subject();

  // 1. Periodically check for new fundings and add new fundings to the queue
  const pollForGenesisFunded$ = interval(pollInterval).pipe(
    startWith(0),
    takeUntil(stop$),
    tap(() =>
      logger.trace(`Polling for new funded inscriptions to fund reveal`),
    ),
    switchMap(() =>
      from(
        fundingDao.listAllFundingsByStatus({
          id: collectionId,
          fundingStatus: "genesis",
        }),
      ),
    ),
    tap((funded) => {
      logger.trace(
        `Starting to watch genesis ${funded.id} for address ${funded.address} `,
      );
    }),
    tap((funding) => logger.trace(`Enqueuing reveal funding ${funding.id}`)),
    mergeMap((funded) => {
      return from(
        Promise.all([
          fundingDao.getFunding(funded.id),
          fundingDocDao.getInscriptionTransaction({
            id: funded.id,
            fundingAddress: funded.address,
          }),
        ]).then(async ([funded, doc]) => {
          return doc.writableInscriptions.map((inscription) => ({
            inscription,
            funded,
            doc,
          }));
        }),
      );
    }),
    mergeMap((inscriptions) =>
      from(inscriptions).pipe(
        mergeMap(({ inscription, funded, doc }) =>
          from(
            enqueueCheckTxo({
              address: inscription.inscriptionAddress,
              mempoolBitcoinClient,
            }),
          ).pipe(
            catchError((error) => {
              // logger.error(error, "Error checking funding for", funded.address);
              return EMPTY;
            }),
            // retry({
            //   delay(error, retryCount) {
            //     return timer(customBackoff(retryCount + funded.timesChecked));
            //   },
            // }),
            map((mempoolResponse) => {
              if (!mempoolResponse) {
                throw new Error("No mempool response");
              }
              return {
                inscription,
                funded,
                doc,
                mempoolResponse,
              };
            }),
          ),
        ),
      ),
    ),

    // tap((funding) => {
    //   logger.info(`Revealing ${funding.inscription.inscriptionAddress}`);
    // }),
    mergeMap(({ inscription, funded, mempoolResponse, doc }) => {
      const { txid, vout, amount } = mempoolResponse;
      return from([
        generateRevealTransaction({
          // address: funded.destinationAddress,
          // amount,
          // inscription,
          // secKey: new SecretKey(Buffer.from(doc.secKey, "hex")),
          // txid,
          // vout,
          inputs: [{
            address: funded.destinationAddress,
            amount: doc.
          }]
        }),
      ]).pipe(
        mergeMap((revealTx) => {
          return from(
            mempoolBitcoinClient.transactions.postTx({
              txhex: revealTx,
            }) as Promise<string>,
          ).pipe(
            tap((txid) => {
              logger.info(`Reveal transaction ${txid} sent`);
            }),
            catchError((error) => {
              // logger.error(
              //   error,
              //   `Error sending reveal transaction for ${funded.id}`,
              // );
              return EMPTY;
            }),
            // retry({
            //   delay(error, retryCount) {
            //     logger.error(
            //       error,
            //       `Error sending reveal transaction for ${funded.id}`,
            //     );
            //     return timer(customBackoff(retryCount + funded.timesChecked));
            //   },
            // }),
          );
        }),
        tap(async (revealTxid) => {
          if (revealTxid) {
            await fundingDao.revealFunded({
              id: funded.id,
              revealTxid,
            });
          }
        }),
        map(() => {
          return funded;
        }),
      );
    }),
  );
  // When $fundings is complete and we have a vout value, we can update the funding with the new txid and vout
  // This assumes the checkFundings observable emits individual funding results.
  pollForGenesisFunded$.subscribe({
    next: async (reveal) => {
      if (!reveal) {
        return;
      }
      logger.info(`Reveal ${reveal.id} is funded!`);
      notifier?.(reveal);
    },
    error(err) {
      logger.error(err);
    },
  });

  return () => {
    stop$.next(void 0);
    stop$.complete();
  };
}
