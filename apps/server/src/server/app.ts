import express from "express";
import bodyParser from "body-parser";

export function createApp() {
  const app = express();

  app.use(bodyParser.json());

  return app;
}
