import { JobRunner } from "./job-runner";
import { Config } from "./config";
import { MediaEncoder } from "./media-encoder";

export async function main(env: NodeJS.ProcessEnv) {
  const config = Config.fromEnv(env);
  const mediaEncoder = MediaEncoder.create(config.pathToFfmpeg, config.redisHost, config.redisPort);
  const jobRunner = await JobRunner.create(config.redisHost, config.redisPort, mediaEncoder);

  jobRunner.start();

  await new Promise((resolve) => {
    process.on("SIGINT", resolve);
    process.on("SIGTERM", resolve);
  });

  await jobRunner.close();

  process.exit(0);
}
