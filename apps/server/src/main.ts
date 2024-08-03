import { Config } from "./config";
import { MediaConvertClient, S3Client } from "./aws-clients";
import Redis from "ioredis";
import { AuthService, RedisBackedAuthService } from "./services/auth";

export async function main(env: NodeJS.ProcessEnv) {
  const config = Config.fromEnv(env);
  const redis = new Redis(config.redisPort, config.redisHost);
  const authService = new RedisBackedAuthService(redis, {
    jwtSecretKey: config.jwtSecretKey,
    refreshTokenTtl: "7d",
    accessTokenTtl: "15m",
    resetPasswordTokenTtl: "1m",
  });
  const s3Client = new S3Client(config.awsAccessKeyId, config.awsSecretAccessKey);
  const mediaConvertClient = new MediaConvertClient(config.awsAccessKeyId, config.awsSecretAccessKey);

  console.log("Hello World");
}
