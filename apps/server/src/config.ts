import { z } from "zod";

const EnvSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
});

export class Config {
  constructor(
    // AWS configuration
    public readonly awsAccessKeyId: string,
    public readonly awsSecretAccessKey: string,
  ) {}

  public static fromEnv(env: unknown) {
    const parsedEnv = EnvSchema.parse(env);

    return new Config(parsedEnv.AWS_ACCESS_KEY_ID, parsedEnv.AWS_SECRET_ACCESS_KEY);
  }
}
