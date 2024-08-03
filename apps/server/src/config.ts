import { z } from "zod";

const EnvSchema = z.object({
  // AWS
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.preprocess(Number, z.number()),
  // Auth
  JWT_SECRET_KEY: z.string(),
});

export class Config {
  constructor(
    // AWS
    public readonly awsAccessKeyId: string,
    public readonly awsSecretAccessKey: string,
    // Redis
    public readonly redisHost: string,
    public readonly redisPort: number,
    // Auth
    public readonly jwtSecretKey: string,
  ) {}

  public static fromEnv(env: unknown) {
    const parsedEnv = EnvSchema.parse(env);

    return new Config(
      // AWS
      parsedEnv.AWS_ACCESS_KEY_ID,
      parsedEnv.AWS_SECRET_ACCESS_KEY,
      // Redis
      parsedEnv.REDIS_HOST,
      parsedEnv.REDIS_PORT,
      // Auth
      parsedEnv.JWT_SECRET_KEY,
    );
  }
}
