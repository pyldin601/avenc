import { Config } from "./config";
import { S3Client } from "@aws-sdk/client-s3";
import { RedisBackedAuthService } from "./services/auth";
import Redis from "ioredis";
import ms from "ms";
import { S3BackedFileService } from "./services/file-service";

export async function main(env: NodeJS.ProcessEnv) {
  const config = Config.fromEnv(env);
  const redis = new Redis(config.redisPort, config.redisHost);
  const s3Client = new S3Client({
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });
  const authService = new RedisBackedAuthService(redis, {
    jwtSecretKey: config.jwtSecretKey,
    refreshTokenTtl: ms("7d"),
    accessTokenTtl: ms("15m"),
    resetPasswordTokenTtl: ms("1m"),
  });
  const fileService = new S3BackedFileService(s3Client, redis, {
    guestFileTtl: ms("24h"),
  });

  console.log("Hello World");
}
