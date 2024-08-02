import fs from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import fluentFfmpeg from "fluent-ffmpeg";
import makeDebug from "debug";
import Redis from "ioredis";
import { EncodingStatus } from "./encoding-status";

const debug = makeDebug("MediaEncoder");

const ENCODER_EVENTS_KEY = "avenc:encoder:events";

interface EncodingParams {
  encodingFormat: "mp3";
  audioBitrate: number | null;
}

interface EncodingContext {
  encodingJobId: string;
}

export class MediaEncoder {
  public static create(pathToFfmpeg: string, redisHost: string, redisPort: number) {
    const redisClient = new Redis(redisPort, redisHost);

    return new MediaEncoder(pathToFfmpeg, redisClient);
  }

  constructor(
    private readonly pathToFfmpeg: string,
    private readonly redisClient: Redis,
  ) {}

  public async encode(
    srcUrl: string,
    dstUrl: string,
    // For hinting dummy decoders if they can't recognize the source file format without knowing file extension.
    srcExt: string,
    params: EncodingParams,
    ctx: EncodingContext,
  ): Promise<void> {
    // Create temp dir for encoding job
    debug("Creating temp dir for encoding file");
    const tmpDir = await mkdtemp(`${os.tmpdir()}${path.sep}`);

    try {
      // Download source file
      debug("Downloading source file to the temp dir");
      await this.sendEncodingStatus({ status: "reading" }, ctx);
      const sourceFile = path.join(tmpDir, `input.${srcExt}`);
      await this.downloadFile(srcUrl, sourceFile);

      // Encode file
      debug("Encoding file");
      const dstFile = path.join(tmpDir, `output`);
      await this.sendEncodingStatus({ status: "encoding", percent: 0 }, ctx);
      await this.encodeFileUsingFfmpeg(sourceFile, dstFile, params, (percent) => {
        this.sendEncodingStatus({ status: "encoding", percent }, ctx).catch((error) => {
          debug("Unable to publish encoding status", error);
        });
      });
      await this.sendEncodingStatus({ status: "encoding", percent: 100 }, ctx);

      // Upload encoded file
      debug("Uploading encoded file");
      await this.sendEncodingStatus({ status: "writing" }, ctx);
      await this.uploadFile(dstFile, dstUrl);
    } catch (error) {
      await this.sendEncodingStatus({ status: "error" }, ctx);
      throw error;
    } finally {
      // Cleanup created files and directories
      debug("Removing temp dir");
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  private async downloadFile(srcUrl: string, dstFile: string): Promise<void> {
    const srcRes = await fetch(srcUrl);
    if (!srcRes.body) {
      throw new Error("Unable to download the source file");
    }
    const fileStream = fs.createWriteStream(dstFile, { flags: "wx" });
    await finished(Readable.fromWeb(srcRes.body).pipe(fileStream));
  }

  private async uploadFile(srcFile: string, dstUrl: string) {
    const stats = await stat(srcFile);
    const fileSizeInBytes = stats.size;

    const readStream = fs.createReadStream(srcFile);
    const result = await fetch(dstUrl, {
      method: "put",
      headers: { "Content-Length": `${fileSizeInBytes}` },
      duplex: "half",
      body: readStream,
    });

    if (!result.ok) {
      debug("Unable to download the source file", result.statusText);
      throw new Error("Unable to upload the file");
    }
  }

  private async encodeFileUsingFfmpeg(
    srcFile: string,
    dstFile: string,
    params: EncodingParams,
    onProgress: (percent: number) => void,
  ) {
    await new Promise<void>((resolve, reject) => {
      const command = fluentFfmpeg(srcFile).format(params.encodingFormat);

      if (params.audioBitrate) {
        command.audioBitrate(params.audioBitrate);
      }

      command
        .output(dstFile)
        .on("end", () => resolve())
        .on("error", (error) => reject(error))
        .on("progress", (progress) => {
          onProgress(progress.percent ?? 0);
        })
        .setFfmpegPath(this.pathToFfmpeg)
        .run();
    });
  }

  private async sendEncodingStatus(status: EncodingStatus, { encodingJobId }: EncodingContext) {
    await this.redisClient.xadd(ENCODER_EVENTS_KEY, "*", "jobId", encodingJobId, "event", JSON.stringify(status));
  }
}
