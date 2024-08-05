import express from "express";
import Redis from "ioredis";
import { z } from "zod";
import { extname } from "node:path";
import { RedisKeys } from "@avenc/server-libs";
import { FileService } from "../../services/file-service";
import { Config } from "../../config";

export function createTranscodingJob(
  config: Config,
  fileService: FileService,
  redisClient: Redis,
): express.RequestHandler<{ sessionId: string; jobId: string }, { signedUrl: string } | { error: string }> {
  const RequestJsonSchema = z.object({
    filename: z.string(),
    filesize: z.number(),
    output: z.object({
      format: z.enum(["mp3"]),
      quality: z.enum(["low", "medium", "high"]),
    }),
  });

  return async (req, res) => {
    const { sessionId, jobId } = req.params;
    const { filename, filesize, output } = RequestJsonSchema.parse(req.body);

    const sourceFormat = extname(filename.toLowerCase());

    if (sourceFormat === output.format) {
      return res.status(409).json({ error: "Source and output formats are the same" });
    }

    // Create signed URL for the source file.
    const signedUrl = await fileService.createGuestSourceFileSignedUrl(sessionId, jobId, filename, filesize);

    // Persist metadata for the transcoding job.
    const guestFileMetaKey = RedisKeys.GUEST_JOB_KEY.replace("{jobId}", jobId);
    await redisClient.hmset(guestFileMetaKey, {
      filename,
      filesize,
      targetFormat: output.format,
      targetQuality: output.quality,
    });
    await redisClient.pexpire(guestFileMetaKey, config.guestFileTtl);

    // Add the file to files associated with the given session.
    const guestFilesKey = RedisKeys.GUEST_JOBS_KEY.replace("{sessionId}", sessionId);
    await redisClient.zadd(guestFilesKey, Date.now(), jobId);
    await redisClient.pexpire(guestFilesKey, config.guestFileTtl);

    res.json({ signedUrl });
  };
}

export function startTranscodingJob(
  fileService: FileService,
): express.RequestHandler<{ sessionId: string; fileId: string }, { success: boolean }> {
  const RequestJsonSchema = z.object({
    format: z.enum(["mp3"]),
    quality: z.enum(["low", "medium", "high"]),
  });

  return async (req, res) => {
    const { sessionId, fileId } = req.params;
    const { format, quality } = RequestJsonSchema.parse(req.body);

    // TODO Make a temporary signedUrl to upload converted file.
    // TODO Send conversion request using bullmq Queue.
    // TODO How to track jobs?

    res.json({ success: true });
  };
}
