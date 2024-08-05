import express from "express";
import Redis from "ioredis";
import { z } from "zod";
import { extname, basename } from "node:path";
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

  // TODO Assuming for now that the file's extension is the file's format.
  return async (req, res) => {
    const { sessionId, jobId } = req.params;
    const { filename, filesize, output } = RequestJsonSchema.parse(req.body);

    const fileExtension = extname(filename.toLowerCase());

    if (fileExtension === output.format) {
      return res.status(409).json({ error: "Source and output formats are the same." });
    }

    // Create signed URL for the source file.
    const signedUrl = await fileService.createGuestSourceFilePutSignedUrl(sessionId, jobId, filename, filesize);

    // Persist metadata for the transcoding job.
    const guestFileMetaKey = RedisKeys.GUEST_JOB_KEY.replace("{jobId}", jobId);
    await redisClient.hmset(guestFileMetaKey, {
      filename,
      filesize,
      targetFormat: output.format,
      targetQuality: output.quality,
      targetFilename: `${basename(filename, fileExtension)}.${output.format}`,
    });
    await redisClient.pexpire(guestFileMetaKey, config.guestFileTtl);

    // Add the file to files associated with the given session.
    const guestFilesKey = RedisKeys.GUEST_JOBS_KEY.replace("{sessionId}", sessionId);
    await redisClient.zadd(guestFilesKey, Date.now(), jobId);
    await redisClient.pexpire(guestFilesKey, config.guestFileTtl);

    res.status(200).json({ signedUrl });
  };
}

export function startTranscodingJob(
  config: Config,
  fileService: FileService,
  redisClient: Redis,
): express.RequestHandler<{ sessionId: string; jobId: string }, void | { error: string }> {
  return async (req, res) => {
    const { sessionId, jobId } = req.params;

    // Check that this job belongs to the given session.
    const guestFilesKey = RedisKeys.GUEST_JOBS_KEY.replace("{sessionId}", sessionId);
    const result = await redisClient.zscore(guestFilesKey, jobId);
    if (result === null) {
      return res.status(404).json({ error: "No such transcoding job is associated with the session." });
    }

    // Get job metadata
    const guestJobKey = RedisKeys.GUEST_JOB_KEY.replace("{jobId}", jobId);
    const [filename, targetFormat, targetQuality, targetFilename] = await redisClient.hmget(
      guestJobKey,
      "filename",
      "targetFormat",
      "targetQuality",
      "targetFilename",
    );

    if (!filename || !targetFormat || !targetQuality || !targetFilename) {
      return res.status(400).json({ error: "The transcoding job is not configured properly." });
    }

    const sourceFileSignedUrl = await fileService.createGuestSourceFileGetSignedUrl(sessionId, jobId, filename);
    const targetFileSignedUrl = await fileService.createGuestTargetFilePutSignedUrl(sessionId, jobId, targetFilename);

    // TODO Send conversion request using bullmq Queue.
    // TODO How to track jobs?

    res.status(200).end();
  };
}
