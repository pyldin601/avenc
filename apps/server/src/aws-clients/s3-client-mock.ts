import { S3Client } from "./s3-client";

export class S3ClientMock implements S3Client {
  deleteObjects = jest.fn();
  makePutObjectSignedUrl = jest.fn();
}
