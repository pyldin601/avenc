import { S3Client } from "../aws-clients";

export interface Config {
  guestUploadedFileTtlMillis: number;
  guestSignedUrlTtlMillis: number;
}

export abstract class FileService {
  /**
   * Creates a signed URL to upload a source file.
   * This URL should be used then to PUT file content.
   *
   * @param sessionId - The unique identifier for the guest's session.
   * @param jobId - The unique identifier for the transcoding job.
   * @param filename - A filename of the source file.
   * @param filesize - A size of the source file.
   * @return A signed direct URL for the guest to upload the audio file.
   */
  abstract createGuestSourceFileSignedUrl(
    sessionId: string,
    jobId: string,
    filename: string,
    filesize: number,
  ): Promise<string>;

  /**
   * Creates a signed URL to upload transcoded file.
   * This URL should be used then to PUT file content.
   *
   * @param sessionId - The unique identifier for the guest's session.
   * @param jobId - The unique identifier for the transcoding job.
   * @param filename - A filename of the transcoded file.
   * @return A signed direct URL for the transcoder to upload the transcoded file.
   */
  abstract createGuestTargetFileSignedUrl(sessionId: string, jobId: string, filename: string): Promise<string>;
}

export class S3BackedFileService implements FileService {
  constructor(
    private readonly s3Client: S3Client,
    private readonly config: Config,
  ) {}

  public async createGuestSourceFileSignedUrl(
    sessionId: string,
    jobId: string,
    filename: string,
    filesize: number,
  ): Promise<string> {
    const key = `guest/${sessionId}/jobs/${jobId}/${filename}`;

    return this.s3Client.makePutObjectSignedUrl(key, {
      contentLength: filesize,
      objectTtl: this.config.guestUploadedFileTtlMillis,
      signedUrlTtl: this.config.guestSignedUrlTtlMillis,
    });
  }

  public async createGuestTargetFileSignedUrl(sessionId: string, jobId: string, filename: string): Promise<string> {
    const key = `guest/${sessionId}/jobs/${jobId}/output/${filename}`;

    return this.s3Client.makePutObjectSignedUrl(key, {
      objectTtl: this.config.guestUploadedFileTtlMillis,
      signedUrlTtl: this.config.guestSignedUrlTtlMillis,
    });
  }
}
