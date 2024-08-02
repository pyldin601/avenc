import { JobRunner } from "./job-runner";
import { Config } from "./config";
import { MediaEncoder } from "./media-encoder";
import { randomUUID } from "node:crypto";

export async function main(env: NodeJS.ProcessEnv) {
  const config = Config.fromEnv(env);
  const mediaEncoder = new MediaEncoder(config.pathToFfmpeg);
  const jobRunner = await JobRunner.create(config.redisHost, config.redisPort, mediaEncoder);

  await jobRunner.addJob({
    encodingFormat: "mp3",
    srcUrl: "https://file-examples.com/storage/fe44eeb9cb66ab8ce934f14/2017/11/file_example_OOG_5MG.ogg",
    srcExt: "ogg",
    dstUrl: "http://localhost:9000/avenc/test-file.mp3",
    audioBitrate: 128,
    id: randomUUID(),
  });

  jobRunner.start();

  await new Promise((resolve) => {
    process.on("SIGINT", resolve);
    process.on("SIGTERM", resolve);
  });

  await jobRunner.close();

  process.exit(0);
}
