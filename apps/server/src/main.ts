import { Config } from "./config";
import { S3Client } from "./aws-clients";
import { RedisBackedAuthService } from "./services/auth";
import Redis from "ioredis";
import ms from "ms";
import { S3BackedFileService } from "./services/file-service";

export async function main(env: NodeJS.ProcessEnv) {
  const config = Config.fromEnv(env);
  const redis = new Redis(config.redisPort, config.redisHost);
  const authService = new RedisBackedAuthService(redis, {
    jwtSecretKey: config.jwtSecretKey,
    refreshTokenTtlMs: ms("7d"),
    accessTokenTtlMs: ms("15m"),
    resetPasswordTokenTtlMs: ms("1m"),
  });
  const s3Client = new S3Client(config.awsAccessKeyId, config.awsSecretAccessKey);
  const fileService = new S3BackedFileService(s3Client, redis);

  console.log("Hello World");
}
