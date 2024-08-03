import { z } from "zod";

const EnvSchema = z.object({
  // AWS configuration
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  // Redis configuration
  REDIS_HOST: z.string(),
  REDIS_PORT: z.preprocess(Number, z.number()),
});

export class Config {
  constructor(
    // AWS configuration
    public readonly awsAccessKeyId: string,
    public readonly awsSecretAccessKey: string,
    // Redis configuration
    public readonly redisHost: string,
    public readonly redisPort: number,
  ) {}

  public static fromEnv(env: unknown) {
    const parsedEnv = EnvSchema.parse(env);

    return new Config(
      // AWS configuration
      parsedEnv.AWS_ACCESS_KEY_ID,
      parsedEnv.AWS_SECRET_ACCESS_KEY,
      // Redis configuration
      parsedEnv.REDIS_HOST,
      parsedEnv.REDIS_PORT,
    );
  }
}
