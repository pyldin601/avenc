import express from "express";
import { FileService } from "../../services/file-service";
import { z } from "zod";
import { randomUUID } from "node:crypto";

export function createAudioFileUploadLink(
  fileService: FileService,
): express.RequestHandler<{ sessionId: string }, { signedUrl: string; fileId: string }> {
  const RequestJsonSchema = z.object({
    filename: z.string(),
    filesize: z.number(),
  });

  return async (req, res) => {
    const { sessionId } = req.params;
    const { filename, filesize } = RequestJsonSchema.parse(req.body);
    const fileId = randomUUID();

    const signedUrl = await fileService.requestGuestUploadSignedUrl(sessionId, fileId, filename, filesize);

    res.json({ signedUrl, fileId });
  };
}

export function convertAudioFile(
  fileService: FileService,
): express.RequestHandler<{ sessionId: string; fileId: string }, { success: boolean }> {
  const RequestJsonSchema = z.object({
    format: z.enum(["mp3"]),
    quality: z.enum(["low", "medium", "high"]),
  });

  return async (req, res) => {
    const { sessionId, fileId } = req.params;
    const { format, quality } = RequestJsonSchema.parse(req.body);

    // TODO Make a signedUrl to upload converted file.
    // TODO Send conversion request using bullmq Queue.
    // TODO How to track jobs?

    res.json({ success: true });
  };
}
