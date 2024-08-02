import makeDebug from "debug";
import { Queue, Worker } from "bullmq";
import { MediaEncoder } from "./encoder";

const debug = makeDebug("JobRunner");

interface Job {
  id: string;
  srcUrl: string;
  srcExt: string;
  dstUrl: string;
  encodingFormat: "mp3";
  audioBitrate: number | null;
}

const ENCODING_JOBS_QUEUE = "avenc:encoder:queue";

export class JobRunner {
  private encodingWorkers: Array<Worker<Job>> = [];

  public static async create(redisHost: string, redisPort: number, mediaEncoder: MediaEncoder): Promise<JobRunner> {
    const encodingQueue = new Queue<Job>(ENCODING_JOBS_QUEUE, {
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
    // TODO Probe file before sending to encoder
    debug("Adding new encoding job", job);
    await this.queue.add(ENCODING_JOBS_QUEUE, job, { attempts: 1 });
  }

  public start() {
    this.encodingWorkers.push(
      new Worker<Job>(
        ENCODING_JOBS_QUEUE,
        async (job) => {
          debug("Consuming a new encoding job", job.data);
          await this.handleJob(job.data);
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
      { encodingJobId: job.id },
    );
  }

  public async close() {
    debug("Closing");
    await Promise.all(this.encodingWorkers.map((w) => w.close()));
    await this.queue.close();
  }
}
