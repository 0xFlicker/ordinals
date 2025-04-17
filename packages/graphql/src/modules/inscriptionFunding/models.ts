import {
  TInscriptionDoc,
  INewFundingAddressModel,
  InscriptionFile,
  IInscriptionDocCommon,
} from "@0xflick/ordinals-models";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { UnableToGetS3ObjectError } from "../../errors/s3.js";
import { toDataURL, QRCodeToDataURLOptions } from "qrcode";

export class InscriptionFundingModel {
  public id: string;
  public readonly fundingAddress: string;
  public readonly destinationAddress: string;
  private document?: TInscriptionDoc;
  private readonly bucket: string;
  private s3Client: S3Client;

  constructor({
    id,
    document,
    fundingAddress,
    destinationAddress,
    bucket,
    s3Client,
  }: {
    id: string;
    document?: TInscriptionDoc;
    fundingAddress: string;
    destinationAddress: string;
    bucket: string;
    s3Client: S3Client;
  }) {
    this.id = id;
    this.document = document;
    this.fundingAddress = fundingAddress;
    this.destinationAddress = destinationAddress;
    this.bucket = bucket;
    this.s3Client = s3Client;
  }

  public get network() {
    return this.fetchInscription().then((doc) => doc.network);
  }

  public get rootDocumentKey() {
    return `address/${this.fundingAddress}/inscriptions/${this.id}/transaction.json`;
  }
  private _fetchingDocPromise?: Promise<TInscriptionDoc>;
  public async fetchInscription(): Promise<IInscriptionDocCommon> {
    if (this.document) {
      return this.document;
    }
    if (this._fetchingDocPromise) {
      return await this._fetchingDocPromise;
    }
    this._fetchingDocPromise = Promise.resolve().then(async () => {
      const getObjectResponse = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: this.rootDocumentKey,
        }),
      );
      const data = await getObjectResponse.Body?.transformToString();
      if (!data) {
        throw new UnableToGetS3ObjectError(
          this.bucket,
          this.rootDocumentKey,
          "No data returned from S3",
        );
      }
      const mimeType = getObjectResponse.ContentType;

      if (mimeType !== "application/json") {
        throw new UnableToGetS3ObjectError(
          this.bucket,
          this.rootDocumentKey,
          `Invalid mime type ${mimeType}`,
        );
      }
      let document: TInscriptionDoc;
      try {
        document = JSON.parse(data);
      } catch (e) {
        throw new UnableToGetS3ObjectError(
          this.bucket,
          this.rootDocumentKey,
          "Unable to parse JSON",
        );
      }
      return document;
    });
    this.document = await this._fetchingDocPromise;
    return this.document;
  }
  public async getInscriptionContentKey(inscriptionIndex: number) {
    const doc = await this.fetchInscription();
    return `address/${this.fundingAddress}/inscriptions/${
      this.id
    }/content/${inscriptionIndex.toString().padStart(4, "0")}.json`;
  }

  private _inscriptions: Map<string, Promise<InscriptionFile>> = new Map();
  public async fetchInscriptionContent(s3Client: S3Client, index: number) {
    const key = await this.getInscriptionContentKey(index);
    if (this._inscriptions.has(key)) {
      return await this._inscriptions.get(key)!;
    }
    const promiseDoc = Promise.resolve().then(async () => {
      const getObjectResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      const data = await getObjectResponse.Body?.transformToString();
      if (!data) {
        throw new UnableToGetS3ObjectError(
          this.bucket,
          key,
          "No data returned from S3",
        );
      }
      let doc: InscriptionFile;
      try {
        doc = JSON.parse(data);
      } catch (e) {
        throw new UnableToGetS3ObjectError(
          this.bucket,
          key,
          "Unable to parse JSON",
        );
      }
      return doc;
    });
    this._inscriptions.set(key, promiseDoc);

    return promiseDoc;
  }

  public async fetchAllInscriptionContent(s3Client: S3Client) {
    const document = await this.fetchInscription();
    const inscriptions = document.writableInscriptions;
    // returns inscriptions in the order they are inscribed
    // Assumes all fetched
    const inscriptionOrder = async (): Promise<InscriptionFile[]> => {
      return Promise.all(
        inscriptions.map(
          async (_, index) =>
            await this._inscriptions.get(
              await this.getInscriptionContentKey(index),
            )!,
        ),
      );
    };
    // full, no need to check for missing
    if (this._inscriptions.size === inscriptions.length) {
      return inscriptionOrder();
    }
    // all existing tap keys
    const existingTapKeys: Map<number, boolean> = [...this._inscriptions.keys()]
      .map(Number)
      .reduce((memo, pointerIndex) => {
        memo.set(pointerIndex, true);
        return memo;
      }, new Map<number, boolean>());
    const missingInscriptions = inscriptions.filter(
      (inscription) => !existingTapKeys.has(inscription.pointerIndex ?? 0),
    );
    await Promise.all(
      missingInscriptions.map(async (inscription) =>
        this.fetchInscriptionContent(s3Client, inscription.pointerIndex ?? 0),
      ),
    );
    return inscriptionOrder();
  }

  public get inscriptions() {
    return this.fetchInscription().then((d) => d.writableInscriptions);
  }

  public get qrValue() {
    return this.fundingAmountBtc.then((fundingAmountBtc) => {
      return `bitcoin:${this.fundingAddress}?amount=${fundingAmountBtc}`;
    });
  }

  public get fundingAmountBtc() {
    return this.fetchInscription().then((f) => f.fundingAmountBtc);
  }

  private _qrSrc?: {
    src: Promise<string>;
    memo: string;
  };
  private qrOptionsToMemo(options: QRCodeToDataURLOptions) {
    return JSON.stringify(options);
  }
  public async getQrSrc(options: QRCodeToDataURLOptions) {
    const optionsHash = this.qrOptionsToMemo(options);
    if (!this._qrSrc || optionsHash !== this._qrSrc.memo) {
      this._qrSrc = {
        src: toDataURL(await this.qrValue, options),
        memo: optionsHash,
      };
    }
    return this._qrSrc;
  }

  public get overhead() {
    return this.fetchInscription().then((d) => d.overhead);
  }

  public get padding() {
    return this.fetchInscription().then((d) => d.padding);
  }
}
