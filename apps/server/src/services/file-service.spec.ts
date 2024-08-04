import Redis from "ioredis";
import RedisMemoryServer from "redis-memory-server";
import { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { afterEach } from "node:test";
import { FileService, S3BackedFileService } from "./file-service";

const redisServer = new RedisMemoryServer();

let redisClient: Redis;
let fileService: FileService;

beforeEach(async () => {
  const redisPort = await redisServer.getPort();
  const redisHost = await redisServer.getHost();
  redisClient = new Redis(redisPort, redisHost, { maxRetriesPerRequest: null });

  const s3Client = new S3Client({ region: "eu-central-1" });

  fileService = new S3BackedFileService(s3Client, redisClient, {
    guestFileTtl: 60_000,
  });
});

afterEach(async () => {
  redisClient.disconnect();
  await redisServer.stop();
});

describe("create upload link", () => {
  it("should request guest link to upload audio file", async () => {
    const sessionId = randomUUID();
    const fileId = randomUUID();

    const uploadLink = await fileService.requestGuestUploadLink(sessionId, fileId);

    expect(uploadLink).toContain("https://");
    expect(uploadLink).toContain(sessionId);
    expect(uploadLink).toContain(fileId);
  });
});
