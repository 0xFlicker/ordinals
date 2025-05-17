import { FundingDocDao } from "@0xflick/ordinals-backend";
import {
  BitcoinNetworkNames,
  InscriptionFile,
  TInscriptionDoc,
} from "@0xflick/ordinals-models";
import { Web3User } from "generated-types/graphql";

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
  public readonly id: string;
  private readonly _txid: string;
  private readonly _fundingAddress: string;
  private readonly _inscriptionIndex: number;
  private readonly _owner?: Promise<Web3User>;
  private readonly _content?: Promise<string>;
  private readonly _contentUrl?: Promise<string>;
  private readonly _contentLength?: Promise<number>;
  private readonly _contentType?: Promise<string>;
  private readonly _parents?: Promise<InscriptionModel[]>;
  private readonly _children?: Promise<InscriptionModel[]>;
  private readonly _network: BitcoinNetworkNames;

  private _contentPromise: Promise<InscriptionFile> | undefined;
  private readonly fundingDocDao: FundingDocDao;

  constructor(
    data: Partial<IInscriptionModel> & {
      id: string;
      txid: string;
      fundingAddress: string;
      inscriptionIndex: number;
      network: BitcoinNetworkNames;
      context: {
        fundingDocDao: FundingDocDao;
      };
    },
  ) {
    this.id = data.id;
    this._owner = data.owner ? Promise.resolve(data.owner) : undefined;
    this._content = data.content ? Promise.resolve(data.content) : undefined;
    this._contentUrl = data.contentUrl
      ? Promise.resolve(data.contentUrl)
      : undefined;
    this._contentLength = data.contentLength
      ? Promise.resolve(data.contentLength)
      : undefined;
    this._contentType = data.contentType
      ? Promise.resolve(data.contentType)
      : undefined;
    this._parents = data.parents ? Promise.resolve(data.parents) : undefined;
    this._children = data.children ? Promise.resolve(data.children) : undefined;
    this._txid = data.txid;
    this._fundingAddress = data.fundingAddress;
    this._inscriptionIndex = data.inscriptionIndex;
    this.fundingDocDao = data.context.fundingDocDao;
    this._network = data.network;
  }

  private async primeContent() {
    if (this._contentPromise) {
      return this._contentPromise;
    }

    this._contentPromise = this.fundingDocDao.getInscriptionContent({
      id: this.id,
      fundingAddress: this._fundingAddress,
      inscriptionIndex: this._inscriptionIndex,
    });
    return this._contentPromise;
  }

  get content() {
    return (
      this._contentPromise ??
      this.primeContent().then((content) => content.content)
    );
  }

  get contentUrl() {
    return (
      this._contentUrl ??
      Promise.resolve(
        `https://ordinals.com/inscription/${this._txid}i${this._inscriptionIndex}`,
      )
    );
  }

  get contentLength() {
    return (
      this._contentLength ??
      this.primeContent().then((content) => content.content.byteLength)
    );
  }

  get contentType() {
    return (
      this._contentType ??
      this.primeContent().then((content) => content.mimetype)
    );
  }

  get parents() {
    // TODO: implement
    return Promise.resolve([]);
  }

  get children() {
    // TODO: implement
    return Promise.resolve([]);
  }
}
