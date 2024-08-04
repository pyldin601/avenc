import express from "express";
import { FileService } from "../../services/file-service";

/**
 * response:
 * { signedUrl: string, fileId: string }
 */
export function createAudioFileUploadLink(fileService: FileService): express.RequestHandler {
  return async (req, res) => {
    const { sessionId } = req.params;
  };
}

export function convertAudioFile(fileService: FileService): express.RequestHandler {
  return async (req, res) => {
    const { sessionId, fileId } = req.params;
  };
}
