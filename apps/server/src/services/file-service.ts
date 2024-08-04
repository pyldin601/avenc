import { undefined } from "zod";

export interface Metadata {
  format: string;
  audioBitrate: number;
  duration: number;
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
  public async requestGuestUploadLink(sessionId: string, fileId: string): Promise<string> {
    throw new Error("Not implemented");
  }

  public async analyzeUploadedGuestFile(sessionId: string, fileId: string): Promise<Metadata> {
    throw new Error("Not implemented");
  }
}
