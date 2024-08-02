import makeDebug from "debug";
import { Queue, Worker } from "bullmq";

const debug = makeDebug("JobRunner");

interface Job {
  id: string;
}

const ENCODING_JOBS_QUEUE = "avenc:Encoding";

export class JobRunner {
  private encodingWorkers: Array<Worker<Job>> = [];

  public static async create(redisHost: string, redisPort: number): Promise<JobRunner> {
    const encodingQueue = new Queue<Job>(ENCODING_JOBS_QUEUE, {
      connection: { host: redisHost, port: redisPort },
    });

    return new JobRunner(redisHost, redisPort, encodingQueue);
  }

  constructor(
    private readonly redisHost: string,
    private readonly redisPort: number,
    private readonly queue: Queue<Job>,
  ) {}

  public async addJob(job: Job): Promise<void> {
    debug("Adding new encoding job", job);
    await this.queue.add(ENCODING_JOBS_QUEUE, job);
  }

  public start() {
    this.encodingWorkers.push(
      new Worker<Job>(
        ENCODING_JOBS_QUEUE,
        async (job) => {
          debug("Consume job", job.data);
          await this.handleJob(job.data);
        },
        {
          connection: { host: this.redisHost, port: this.redisPort },
        },
      ),
    );
  }

  private async handleJob(job: Job): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  public async close() {
    debug("Closing");
    await Promise.all(this.encodingWorkers.map((w) => w.close()));
    await this.queue.close();
  }
}
