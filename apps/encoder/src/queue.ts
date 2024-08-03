import { RedisKeys } from "@avenc/server-libs";
import makeDebug from "debug";
import { Queue, Worker } from "bullmq";
import { MediaEncoder } from "./encoder";

const debug = makeDebug("JobRunner");

interface Job {
  id: string;
  userId: string;
  srcUrl: string;
  srcExt: string;
  dstUrl: string;
  encodingFormat: "mp3";
  audioBitrate: number | null;
}

export class JobRunner {
  private encodingWorkers: Array<Worker<Job>> = [];

  public static async create(redisHost: string, redisPort: number, mediaEncoder: MediaEncoder): Promise<JobRunner> {
    const encodingQueue = new Queue<Job>(RedisKeys.ENCODER_QUEUE_KEY, {
      connection: { host: redisHost, port: redisPort },
    });

    return new JobRunner(redisHost, redisPort, encodingQueue, mediaEncoder);
  }

  constructor(
    private readonly redisHost: string,
    private readonly redisPort: number,
    private readonly queue: Queue<Job>,
    private readonly mediaEncoder: MediaEncoder,
  ) {}

  public async addJob(job: Job): Promise<void> {
    debug("Adding new encoding job", job);
    await this.queue.add(RedisKeys.ENCODER_QUEUE_KEY, job);
  }

  //
  // Multiple calls to start() start multiple parallel workers.
  //
  public start() {
    this.encodingWorkers.push(
      new Worker<Job>(
        RedisKeys.ENCODER_QUEUE_KEY,
        (job) => {
          debug("Consuming a new encoding job", job.data);
          return this.handleJob(job.data);
        },
        {
          connection: { host: this.redisHost, port: this.redisPort },
        },
      ),
    );
  }

  private async handleJob(job: Job): Promise<void> {
    await this.mediaEncoder.encode(
      job.srcUrl,
      job.dstUrl,
      job.srcExt,
      {
        encodingFormat: job.encodingFormat,
        audioBitrate: job.audioBitrate,
      },
      {
        jobId: job.id,
        userId: job.userId,
      },
    );
  }

  public async close() {
    debug("Closing");
    await Promise.all(this.encodingWorkers.map((w) => w.close()));
    await this.queue.close();
  }
}
