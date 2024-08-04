import express from "express";
import { createAudioFileUploadLink, convertAudioFile } from "./guest-mode";
import { FileService } from "../../services/file-service";

export function createRoutes(fileService: FileService) {
  const router = express.Router();

  router.post(`/guest/{sessionId}/create-upload-link`, createAudioFileUploadLink(fileService));
  router.post(`/guest/{sessionId}/files/{fileId}/convert`, convertAudioFile(fileService));

  return router;
}
