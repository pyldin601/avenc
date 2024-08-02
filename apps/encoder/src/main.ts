import { JobRunner } from "./job-runner";
import { Config } from "./config";
import { MediaEncoder } from "./media-encoder";

export async function main(env: NodeJS.ProcessEnv) {
  const config = Config.fromEnv(env);
  const mediaEncoder = new MediaEncoder(config.pathToFfmpeg);
  const jobRunner = await JobRunner.create(config.redisHost);

  try {
    await Promise.all([jobRunner.consumeTasks()]);
  } finally {
    await jobRunner.close();
  }
}
