import { JobRunner } from "./job-runner";
import { Config } from "./config";
import { MediaEncoder } from "./media-encoder";
import { v4 } from "uuid";

export async function main(env: NodeJS.ProcessEnv) {
  const config = Config.fromEnv(env);
  const mediaEncoder = new MediaEncoder(config.pathToFfmpeg);
  const jobRunner = await JobRunner.create(config.redisHost);

  for (let i = 0; i <= 100; i += 1) {
    await jobRunner.addJob({ id: v4() });
  }

  try {
    await Promise.all([jobRunner.consumeJobs()]);
  } finally {
    await jobRunner.close();
  }
}
