import fs from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import fluentFfmpeg from "fluent-ffmpeg";

interface EncodingParams {
  encodingFormat: "mp3";
  audioBitrate: number | null;
}

interface EncodingContext {
  encodingJobId: string;
}

export class MediaEncoder {
  constructor(private readonly pathToFfmpeg: string) {}

  public async encode(
    srcUrl: string,
    dstUrl: string,
    // For hinting dummy decoders if they can't recognize the source file format without knowing file extension.
    srcExt: string,
    params: EncodingParams,
    ctx: EncodingContext,
  ): Promise<void> {
    // Create temp dir for encoding job
    const tmpDir = await mkdtemp(`${os.tmpdir()}${path.sep}`);

    // Download source file
    const sourceFile = path.join(tmpDir, `input.${srcExt}`);
    await this.downloadFile(srcUrl, sourceFile);

    // Encode file
    const dstFile = path.join(tmpDir, `output`);
    await this.encodeFileUsingFfmpeg(sourceFile, dstFile, params, ctx);

    // Upload encoded file
    await this.uploadFile(dstFile, dstUrl);

    // Cleanup created files and directories
    await rm(tmpDir, { recursive: true, force: true });
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
      body: readStream,
    });

    if (!result.ok) {
      throw new Error("Unable to upload the file");
    }
  }

  private async encodeFileUsingFfmpeg(srcFile: string, dstFile: string, params: EncodingParams, ctx: EncodingContext) {
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
          // TODO Publish encoding progress progress
          console.log("progress", progress);
        })
        .run();
    });
  }
}
