import { createClient, RedisClientType, RedisModules, RedisFunctions, RedisScripts } from "@redis/client";
import z from "zod";
import makeDebug from "debug";

const debug = makeDebug("JobRunner");

const JobSchema = z.object({
  id: z.string(),
});

const ENCODING_JOBS_KEY = "avenc:encoding-jobs";
const CURRENT_ENCODING_JOBS_KEY = "avenc-current-encoding-jobs";

export class JobRunner {
  private isRunning: boolean;

  public static async create(redisUrl: string): Promise<JobRunner> {
    const redisClient = createClient({ url: redisUrl });

    await redisClient.connect();

    debug("Connected to redis host");

    return new JobRunner(redisClient);
  }

  constructor(private readonly redisClient: RedisClientType<RedisModules, RedisFunctions, RedisScripts>) {
    this.isRunning = true;
  }

  public async addJob(task: unknown): Promise<void> {
    const rawJob = JSON.stringify(task);

    debug("Adding new encoding job", rawJob);
    await this.redisClient.zAdd(ENCODING_JOBS_KEY, { score: performance.now(), value: rawJob });
    // TODO: Notify suspended runners
  }

  public async consumeJobs(): Promise<void> {
    debug("Starting to consume jobs");

    while (this.isRunning) {
      const rawJobs = await this.redisClient.zRange(ENCODING_JOBS_KEY, 0, -1);
      const totalJobs = rawJobs.length;
      debug(`Found ${totalJobs} in the queue`);

      if (totalJobs === 0) {
        debug(`Suspending`);
        // TODO: Wait for a new job
        await new Promise((resolve) => setTimeout(resolve, 1000));
        break;
      }

      for (let i = 0; i < totalJobs; i += 1) {
        const rawJob = rawJobs[i];
        debug("Reading job", rawJob);

        const parseResult = JobSchema.safeParse(JSON.parse(rawJob));
        if (!parseResult.success) {
          debug("Unable to read the job; skipping", rawJob, parseResult.error);
          await this.redisClient.zRem(ENCODING_JOBS_KEY, rawJobs[i]);
          continue;
        }

        const job = parseResult.data;
        const success = await this.redisClient.hSetNX(CURRENT_ENCODING_JOBS_KEY, job.id, job.id);
        if (!success) {
          debug("This job already consuming");
          // This task is already processing: skip
          continue;
        }

        // TODO: Process encoding job
        debug("Processing job");

        debug("Removing job from the queue");
        await this.redisClient.zRem(ENCODING_JOBS_KEY, rawJobs[i]);
        await this.redisClient.hDel(CURRENT_ENCODING_JOBS_KEY, job.id);
      }
    }
  }

  public async close() {
    this.isRunning = false;
    // TODO: Await for jobs running to finish
  }
}
