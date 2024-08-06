import express from "express";
import Redis from "ioredis";
import { createTranscodingJob, startTranscodingJob } from "./guest-mode";
import { FileService } from "../../services/file-service";
import { Config } from "../../config";

export function createRoutes(fileService: FileService, redisClient: Redis, config: Config) {
  const router = express.Router();

  router.post(`/guest/:sessionId/jobs/:jobId/create`, createTranscodingJob(config, fileService, redisClient));
  router.post(`/guest/:sessionId/jobs/:jobId:/transcode`, startTranscodingJob(config, fileService, redisClient));

  return router;
}
