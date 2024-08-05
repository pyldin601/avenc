import express from "express";
import { createTranscodingJob, startTranscodingJob } from "./guest-mode";
import { FileService } from "../../services/file-service";

export function createRoutes(fileService: FileService) {
  const router = express.Router();

  router.post(`/guest/:sessionId/jobs/:jobId/create`, createTranscodingJob(fileService));
  router.post(`/guest/:sessionId/jobs/:jobId:/transcode`, startTranscodingJob(fileService));

  return router;
}
