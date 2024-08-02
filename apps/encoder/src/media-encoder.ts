interface EncodingParams {
  format: string;
  bitrate: number | null;
}

interface EncodingContext {
  encodingJobId: string;
}

export class MediaEncoder {
  constructor(private readonly pathToFfmpeg: string) {}

  public async encode(srcFile: unknown, dstFile: unknown, params: EncodingParams, ctx: EncodingContext): Promise<void> {
    // TODO Read source file from signed source url
    // TODO Encode file with desired encoding params
    // TODO Upload encoded file to the signed dest url
    // TODO Cleanup temp files
    // TODO Handle errors
    //
    // TODO Stream and store encoding progress to the redis subject
  }
}
