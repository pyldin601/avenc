import { createClient, RedisClientType, RedisModules, RedisFunctions, RedisScripts } from "@redis/client";
import { z } from "zod";

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

    return new JobRunner(redisClient);
  }

  constructor(private readonly redisClient: RedisClientType<RedisModules, RedisFunctions, RedisScripts>) {
    this.isRunning = true;
  }

  public async addTask(task: unknown): Promise<void> {
    await this.redisClient.zAdd(ENCODING_JOBS_KEY, { score: Date.now(), value: JSON.stringify(task) });
    // TODO: Notify suspended runners
  }

  public async consumeTasks(): Promise<void> {
    while (this.isRunning) {
      const rawJobs = await this.redisClient.zRangeByScore(ENCODING_JOBS_KEY, 0, 0);
      const totalJobs = rawJobs.length;

      if (totalJobs === 0) {
        // TODO: Wait for a new job
        break;
      }

      for (let i = 0; i < totalJobs; i += 1) {
        const rawJob = rawJobs[i];
        const job = JobSchema.parse(rawJob);

        const success = await this.redisClient.hSetNX(CURRENT_ENCODING_JOBS_KEY, job.id, job.id);
        if (!success) {
          // This task is already processing: skip
          continue;
        }

        // TODO: Process encoding job

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
