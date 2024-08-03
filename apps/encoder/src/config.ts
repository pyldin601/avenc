import { z } from "zod";

const EnvSchema = z.object({
  REDIS_HOST: z.string(),
  REDIS_PORT: z.preprocess(Number, z.number()),
  PATH_TO_FFMPEG: z.string(),
});

export class Config {
  constructor(
    public readonly redisHost: string,
    public readonly redisPort: number,
    public readonly pathToFfmpeg: string,
  ) {}

  public static fromEnv(env: unknown) {
    const parsedEnv = EnvSchema.parse(env);

    return new Config(parsedEnv.REDIS_HOST, parsedEnv.REDIS_PORT, parsedEnv.PATH_TO_FFMPEG);
  }
}
