import { createLogger } from "@0xflick/ordinals-backend";
import {
  BitcoinNetworkNames,
  IAddressInscriptionModel,
  InscriptionFile,
  TInscriptionDoc,
} from "@0xflick/ordinals-models";
import { Web3User } from "generated-types/graphql";
import { InscriptionDataLoader } from "./providers";

const logger = createLogger({
  name: "inscriptions/models",
});

/* graphql type
type Inscription {
  id: ID!

  owner: Web3User

  content: String!
  contentUrl: String!
  contentLength: Int!
  contentType: String!

  parents: [Inscription!]!
  children: [Inscription!]!
}
  */

export type IInscriptionModel = {
  id: string;
  owner: Web3User;
  content: string;
  contentUrl: string;
  contentLength: number;
  contentType: string;
  parents: InscriptionModel[];
  children: InscriptionModel[];
};

export class InscriptionModel {
  private readonly _txid?: string;
  private readonly _inscriptionIndex: number;

  private _contentPromise: Promise<InscriptionFile> | undefined;
  private funding: IAddressInscriptionModel;
  private readonly inscriptionDataLoader: InscriptionDataLoader;

  constructor({
    funding,
    index,
    batchTransactionOffset,
    inscriptionDataLoader,
  }: {
    funding: IAddressInscriptionModel;
    index: number;
    batchTransactionOffset: number;
    inscriptionDataLoader: InscriptionDataLoader;
  }) {
    this.inscriptionDataLoader = inscriptionDataLoader;
    this.funding = funding;
    this._inscriptionIndex = index;
  }

  private async primeContent() {
    if (this._contentPromise) {
      return this._contentPromise;
    }

    this._contentPromise = this.inscriptionDataLoader.getTransactionContentById(
      {
        id: this.id,
        fundingAddress: this.funding.address,
        inscriptionIndex: this._inscriptionIndex,
      },
    );

    return this._contentPromise;
  }

  get id() {
    return this.funding.id;
  }

  get fundingStatus() {
    return this.funding.fundingStatus;
  }

  get contentUtf8() {
    return this.primeContent().then((content) => {
      logger.info({ content: content.content }, "Content");
      return Buffer.from(new Uint8Array(content.content)).toString("utf-8");
    });
  }
  get contentBase64() {
    return this.primeContent().then((content) =>
      Buffer.from(new Uint8Array(content.content)).toString("base64"),
    );
  }

  get contentUrl() {
    return `https://ordinals.com/inscription/${this._txid}i${
      this._inscriptionIndex + (this.funding.batchTransactionOffset ?? 0)
    }`;
  }

  get contentLength() {
    return this.primeContent().then((content) => content.content.byteLength);
  }

  get contentType() {
    return this.primeContent().then((content) => content.mimetype);
  }

  get parents() {
    // TODO: implement
    return [];
  }

  get children() {
    // TODO: implement
    return [];
  }
}
