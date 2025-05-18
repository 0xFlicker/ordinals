import { InjectionToken, Scope } from "@0xflick/graphql-modules";
import DataLoader from "dataloader";
import { FundingDao, FundingDocDao } from "@0xflick/ordinals-backend";
import {
  IAddressInscriptionModel,
  InscriptionFile,
  TInscriptionDoc,
} from "@0xflick/ordinals-models";

export const provide = new InjectionToken<IInscriptionDataLoader>(
  "InscriptionDataLoader",
);

export const scope = Scope.Operation;

export interface IInscriptionDataLoader {
  getTransactionById(id: string): Promise<IAddressInscriptionModel>;
  getTransactionDocumentById({
    id,
    fundingAddress,
  }: {
    id: string;
    fundingAddress: string;
  }): Promise<TInscriptionDoc>;
}

export class InscriptionDataLoader implements IInscriptionDataLoader {
  private fundingDataLoader = new DataLoader<string, IAddressInscriptionModel>(
    (keys) => this.fundingDao.batchGetFundings(keys.map((key) => key)),
  );

  private docDataLoader = new DataLoader<
    `${string}:${string}`,
    TInscriptionDoc
  >((keys) =>
    Promise.all(
      keys.map((key) => {
        const [id, fundingAddress] = key.split(":");
        return this.fundingDocDao.getInscriptionTransaction({
          id,
          fundingAddress,
        });
      }),
    ),
  );

  private transactionContentLoader = new DataLoader<
    `${string}:${string}:${string}`,
    InscriptionFile
  >((keys) =>
    Promise.all(
      keys.map((key) => {
        const [id, fundingAddress, index] = key.split(":");
        return this.fundingDocDao.getInscriptionContent({
          id,
          fundingAddress,
          inscriptionIndex: Number(index),
        });
      }),
    ),
  );

  constructor(
    private readonly fundingDocDao: FundingDocDao,
    private readonly fundingDao: FundingDao,
  ) {}

  getTransactionById(id: string) {
    return this.fundingDataLoader.load(id);
  }

  getTransactionDocumentById({
    id,
    fundingAddress,
  }: {
    id: string;
    fundingAddress: string;
  }) {
    return this.docDataLoader.load(`${id}:${fundingAddress}`);
  }

  getTransactionContentById({
    id,
    fundingAddress,
    inscriptionIndex,
  }: {
    id: string;
    fundingAddress: string;
    inscriptionIndex: number;
  }) {
    return this.transactionContentLoader.load(
      `${id}:${fundingAddress}:${inscriptionIndex}`,
    );
  }
}
