import fs from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

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
    const srcRes = await fetch(srcUrl);
    if (!srcRes.body) {
      throw new Error("Unable to download the source file");
    }
    const fileStream = fs.createWriteStream(sourceFile, { flags: "wx" });
    await finished(Readable.fromWeb(srcRes.body).pipe(fileStream));

    // Encode file
    const dstFile = path.join(tmpDir, `output`);
    // TODO ffmpeg: Encode file with desired encoding params

    // Upload results to dest url
    const stats = await stat(dstFile);
    const fileSizeInBytes = stats.size;

    const readStream = fs.createReadStream(dstFile);
    await fetch(dstUrl, {
      method: "put",
      headers: {
        "Content-Length": `${fileSizeInBytes}`,
      },
      body: readStream,
    });

    // Cleanup created files and directories
    await rm(tmpDir, { recursive: true, force: true });
  }
}
