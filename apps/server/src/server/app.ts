import express from "express";
import bodyParser from "body-parser";
import { createRoutes } from "./routes";
import { FileService } from "../services/file-service";

export function createApp(fileService: FileService) {
  const app = express();

  app.use(bodyParser.json());

  app.use(createRoutes(fileService));

  return app;
}
