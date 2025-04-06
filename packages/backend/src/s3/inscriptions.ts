import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type {
  InscriptionFile,
  InscriptionId,
  TInscriptionDoc,
} from "@0xflick/ordinals-models";
import {
  decryptEnvelope,
  deserializeEnvelope,
  encryptEnvelope,
  serializeEnvelope,
} from "../utils/enevlope.js";
import { KMSClient } from "@aws-sdk/client-kms";
import { createLogger } from "@0xflick/ordinals-backend";

const logger = createLogger({
  name: "inscriptions-s3",
});

export class FundingDocDao {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly kmsClient: KMSClient;

  constructor(s3Client: S3Client, bucket: string, kmsClient: KMSClient) {
    this.s3Client = s3Client;
    this.bucket = bucket;
    this.kmsClient = kmsClient;
  }
  public transactionKey({
    fundingAddress,
    id,
  }: {
    fundingAddress: string;
    id: string;
  }) {
    return `address/${fundingAddress}/inscriptions/${id}/transaction.json`;
  }
  public transactionContentKey({
    id,
    fundingAddress,
    inscriptionIndex,
  }: InscriptionId) {
    return `address/${fundingAddress}/inscriptions/${id}/content/${inscriptionIndex
      .toString()
      .padStart(4, "0")}.json`;
  }
  public async updateOrSaveInscriptionTransaction(
    item: TInscriptionDoc,
    options: {
      secKeyEnvelopeKeyId?: string;
      skipEncryption?: boolean;
    },
  ) {
    const { fundingAddress } = item;

    // logger.debug({ item }, "Updating or saving inscription transaction");

    let secKey = item.secKey;
    if (!options?.skipEncryption) {
      // replace secKey with encrypted envelope
      if (!options.secKeyEnvelopeKeyId) {
        throw new Error("secKeyEnvelopeKeyId required");
      }
      const { base64DataKey, base64Ciphertext, base64AuthTag, base64Iv } =
        await encryptEnvelope({
          plaintext: item.secKey,
          kmsClient: this.kmsClient,
          keyId: options.secKeyEnvelopeKeyId,
        });

      secKey = serializeEnvelope({
        base64AuthTag,
        base64Ciphertext,
        base64DataKey,
        base64Iv,
      });
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.transactionKey({
          fundingAddress,
          id: item.id,
        }),
        Body: JSON.stringify({
          ...item,
          secKey,
        }),
        ContentType: "application/json",
      }),
    );
  }

  public async saveInscriptionContent(item: InscriptionFile): Promise<void> {
    const { id } = item;
    if (!id) {
      throw new Error("id required");
    }
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.transactionContentKey(id),
        Body: JSON.stringify(item),
        ContentType: "application/json",
      }),
    );
  }

  async getInscriptionContent(id: InscriptionId): Promise<InscriptionFile> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.transactionContentKey(id),
      }),
    );
    if (!response.Body) {
      throw new Error("No body returned from S3");
    }
    const data = await response.Body.transformToString();
    return JSON.parse(data);
  }

  async getInscriptionTransaction(request: {
    fundingAddress: string;
    id: string;
    skipDecryption?: boolean;
  }): Promise<TInscriptionDoc> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.transactionKey(request),
      }),
    );
    if (!response.Body) {
      throw new Error("No body returned from S3");
    }
    const data = JSON.parse(await response.Body.transformToString());
    // decrypt secKey
    const { base64DataKey, base64Ciphertext, base64AuthTag, base64Iv } =
      !request.skipDecryption
        ? deserializeEnvelope(data.secKey)
        : {
            base64DataKey: "",
            base64Ciphertext: "",
            base64AuthTag: "",
            base64Iv: "",
          };
    // logger.debug(
    //   { data, base64DataKey, base64Ciphertext, base64AuthTag, base64Iv },
    //   "Decrypted inscription transaction",
    // );

    return {
      ...data,
      secKey: request.skipDecryption
        ? data.secKey
        : await decryptEnvelope({
            base64DataKey,
            base64Ciphertext,
            base64AuthTag,
            base64Iv,
            kmsClient: this.kmsClient,
          }),
    };
  }
}
