import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client as InnerClient } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TypeUtils } from "@avenc/server-libs";

export abstract class S3Client {
  abstract makePutObjectSignedUrl(key: string, contentLength?: number, ttl?: number): Promise<string>;
  abstract makeGetObjectSignedUrl(key: string): Promise<string>;
  abstract deleteObjects(keys: string[]): Promise<void>;
}

export class S3ClientImpl implements S3Client {
  private readonly innerClient: InnerClient;

  constructor(
    accessKeyId: string,
    secretAccessKey: string,
    defaultRegion: string,
    private readonly bucket: string,
  ) {
    this.innerClient = new InnerClient([
      {
        credentials: { accessKeyId, secretAccessKey, defaultRegion },
      },
    ]);
  }

  public async makePutObjectSignedUrl(key: string, contentLength?: number, ttl?: number): Promise<string> {
    const command = new PutObjectCommand({
      Key: key,
      Bucket: this.bucket,
      ContentLength: contentLength,
      Expires: TypeUtils.mapIfDefined(ttl, (value) => new Date(Date.now() + value)),
    });

    return getSignedUrl(this.innerClient, command);
  }

  public async makeGetObjectSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Key: key,
      Bucket: this.bucket,
    });

    return getSignedUrl(this.innerClient, command);
  }

  public async deleteObjects(keys: string[]): Promise<void> {
    const command = new DeleteObjectsCommand({
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
      Bucket: this.bucket,
    });

    await this.innerClient.send(command);
  }
}
