import Redis from "ioredis";
import { S3Client } from "../aws-clients";
import { RedisKeys } from "@avenc/server-libs";

export interface FileMeta {
  filename: string;
  filesize: number;
}

export interface AudioMetadata {
  format: string;
  audioBitrate: number;
  duration: number;
}

export interface Config {
  guestUploadedFileTtlMillis: number;
  guestSignedUrlTtlMillis: number;
}

export abstract class FileService {
  /**
   * Creates a signed URL for the guest to upload a file.
   * This URL should be used then to PUT file content.
   *
   * @param sessionId - The unique identifier for the guest's session.
   * @param fileId - The unique identifier for the uploaded file.
   * @param meta - File metadata of the file to be uploaded.
   * @return A signed direct URL for the guest to upload the audio file.
   */
  abstract createGuestFileUploadSignedUrl(sessionId: string, fileId: string, meta: FileMeta): Promise<string>;

  // /**
  //  * Analyzes the uploaded audio file for a guest and retrieves metadata.
  //  *
  //  * @param sessionId - The unique identifier for the guest's session.
  //  * @param fileId - The unique identifier for the uploaded file.
  //  * @returns A Metadata object containing details about the uploaded audio file.
  //  */
  // abstract analyzeUploadedGuestFile(sessionId: string, fileId: string): Promise<Metadata>;
}

export class S3BackedFileService implements FileService {
  constructor(
    private readonly s3Client: S3Client,
    private readonly redisClient: Redis,
    private readonly config: Config,
  ) {}

  public async createGuestFileUploadSignedUrl(sessionId: string, fileId: string, meta: FileMeta): Promise<string> {
    // Persist the metadata for the file that is going to be uploaded.
    const guestFileMetaKey = RedisKeys.GUEST_FILE_META_KEY.replace("{fileId}", fileId);
    await this.redisClient.hmset(guestFileMetaKey, { filename: meta.filename, filesize: meta.filesize });
    await this.redisClient.pexpire(guestFileMetaKey, this.config.guestUploadedFileTtlMillis);

    // Add the file to the list of files associated with the given session.
    const guestFilesKey = RedisKeys.GUEST_FILES_KEY.replace("{sessionId}", sessionId);
    await this.redisClient.zadd(guestFilesKey, Date.now(), fileId);
    await this.redisClient.pexpire(guestFilesKey, this.config.guestUploadedFileTtlMillis);

    // Make a signed URL for the file that is going to be uploaded.
    const key = `guest/${sessionId}/upload/${fileId}/${meta.filename}`;
    return this.s3Client.makePutObjectSignedUrl(key, meta.filesize, {
      objectTtl: this.config.guestUploadedFileTtlMillis,
      signedUrlTtl: this.config.guestSignedUrlTtlMillis,
    });
  }

  public async getGuestFileUrl(sessionId: string, fileId: string): Promise<string> {
    const key = `guest/${sessionId}/${fileId}/source-file`;

    return this.s3Client.makeGetObjectSignedUrl(key, {
      signedUrlTtl: this.config.guestSignedUrlTtlMillis,
    });
  }
}
