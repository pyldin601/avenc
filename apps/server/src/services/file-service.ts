import Redis from "ioredis";
import { S3Client } from "../aws-clients";

export interface Metadata {
  format: string;
  audioBitrate: number;
  duration: number;
}

export interface Options {
  guestFileTtl: number;
}

export abstract class FileService {
  /**
   * Requests a signed URL for the guest to upload an audio file.
   * This URL should be used to PUT the audio file content.
   *
   * @param sessionId - The unique identifier for the guest's session.
   * @param fileId - The unique identifier for the uploaded file.
   * @return A signed direct URL for the guest to upload the audio file.
   */
  abstract requestGuestUploadLink(sessionId: string, fileId: string): Promise<string>;

  /**
   * Analyzes the uploaded audio file for a guest and retrieves metadata.
   *
   * @param sessionId - The unique identifier for the guest's session.
   * @param fileId - The unique identifier for the uploaded file.
   * @returns A Metadata object containing details about the uploaded audio file.
   */
  abstract analyzeUploadedGuestFile(sessionId: string, fileId: string): Promise<Metadata>;
}

export class S3BackedFileService implements FileService {
  constructor(
    private readonly s3Client: S3Client,
    private readonly redisClient: Redis,
    private readonly options: Options,
  ) {}

  public async requestGuestUploadLink(sessionId: string, fileId: string): Promise<string> {
    const key = `guest/${sessionId}/${fileId}/source-file`;

    return this.s3Client.makePutObjectSignedUrl(key, this.options.guestFileTtl);
  }

  public async getGuestFileUrl(sessionId: string, fileId: string): Promise<string> {
    const key = `guest/${sessionId}/${fileId}/source-file`;

    return this.s3Client.makeGetObjectSignedUrl(key);
  }
}
