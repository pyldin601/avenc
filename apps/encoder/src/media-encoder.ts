interface EncodingParams {
  format: string;
  bitrate: number | null;
}

export class MediaEncoder {
  constructor(private readonly pathToFfmpeg: string) {}

  public async encode(srcFile: unknown, dstFile: unknown, params: EncodingParams): Promise<void> {}
}
