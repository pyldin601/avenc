import { Config } from "./config";
import { RedisBackedAuthService } from "./services/auth";
import Redis from "ioredis";
import ms from "ms";
import { S3BackedFileService } from "./services/file-service";
import { S3ClientImpl } from "./aws-clients";

export async function main(env: NodeJS.ProcessEnv) {
  const config = Config.fromEnv(env);
  const redis = new Redis(config.redisPort, config.redisHost);
  const s3Client = new S3ClientImpl(
    config.awsAccessKeyId,
    config.awsSecretAccessKey,
    config.awsDefaultRegion,
    config.awsS3Bucket,
  );
  const authService = new RedisBackedAuthService(redis, {
    jwtSecretKey: config.jwtSecretKey,
    accessTokenTtlMillis: ms(config.accessTokenTtl),
    refreshTokenTtlMillis: ms(config.refreshTokenTtl),
    resetPasswordTokenTtlMillis: ms(config.resetPasswordTokenTtl),
  });
  const fileService = new S3BackedFileService(s3Client, redis, {
    guestFileTtlMillis: ms(config.guestModeFilesTtl),
  });

  console.log("Hello World");
}
