import { z } from "zod";

const EnvSchema = z.object({
  // AWS
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_S3_BUCKET: z.string(),
  AWS_DEFAULT_REGION: z.string(),
  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.preprocess(Number, z.number()),
  // Auth
  JWT_SECRET_KEY: z.string(),
  // TTLs
  ACCESS_TOKEN_TTL: z.string().default("5m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  RESET_PASSWORD_TOKEN_TTL: z.string().default("15m"),
  GUEST_MODE_SESSION_TTL: z.string().default("24h"),
  GUEST_MODE_FILES_TTL: z.string().default("24h"),
});

export class Config {
  constructor(
    // AWS
    public readonly awsAccessKeyId: string,
    public readonly awsSecretAccessKey: string,
    public readonly awsS3Bucket: string,
    public readonly awsDefaultRegion: string,
    // Redis
    public readonly redisHost: string,
    public readonly redisPort: number,
    // Auth
    public readonly jwtSecretKey: string,
    // TTLs
    public readonly accessTokenTtl: string,
    public readonly refreshTokenTtl: string,
    public readonly resetPasswordTokenTtl: string,
    public readonly guestModeSessionTtl: string,
    public readonly guestModeFilesTtl: string,
  ) {}

  public static fromEnv(env: unknown) {
    const parsedEnv = EnvSchema.parse(env);

    return new Config(
      // AWS
      parsedEnv.AWS_ACCESS_KEY_ID,
      parsedEnv.AWS_SECRET_ACCESS_KEY,
      parsedEnv.AWS_S3_BUCKET,
      parsedEnv.AWS_DEFAULT_REGION,
      // Redis
      parsedEnv.REDIS_HOST,
      parsedEnv.REDIS_PORT,
      // Auth
      parsedEnv.JWT_SECRET_KEY,
      // TTLs
      parsedEnv.ACCESS_TOKEN_TTL,
      parsedEnv.REFRESH_TOKEN_TTL,
      parsedEnv.RESET_PASSWORD_TOKEN_TTL,
      parsedEnv.GUEST_MODE_SESSION_TTL,
      parsedEnv.GUEST_MODE_FILES_TTL,
    );
  }
}
