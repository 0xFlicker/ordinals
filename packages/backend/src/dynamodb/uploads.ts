import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { v4 as uuid } from "uuid";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

type TUploadDb = {
  pk: string;
  uploadId: string;
  multiPartUploadId: string;
  key: string;
};

export class UploadsDAO {
  public static TABLE_NAME = "Uploads";

  private client: DynamoDBDocumentClient;

  constructor(client: DynamoDBClient) {
    this.client = DynamoDBDocumentClient.from(client);
  }

  public async createUpload(upload: {
    uploadId?: string;
    multiPartUploadId: string;
    fileName: string;
  }) {
    const uploadId = upload.uploadId ?? uuid();
    const key = `${uploadId}/${upload.fileName}`;
    const command = new PutCommand({
      TableName: UploadsDAO.TABLE_NAME,
      Item: {
        pk: uploadId,
        uploadId: uploadId,
        multiPartUploadId: upload.multiPartUploadId,
        key,
      },
    });
    await this.client.send(command);
    return { uploadId, key };
  }

  public async getUpload(uploadId: string) {
    const command = new GetCommand({
      TableName: UploadsDAO.TABLE_NAME,
      Key: { pk: uploadId },
    });
    const result = await this.client.send(command);
    return result.Item as TUploadDb;
  }
}
