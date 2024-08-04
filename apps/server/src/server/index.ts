import { Server } from "node:http";
import { createApp } from "./app";
import makeDebug from "debug";
import { FileService } from "../services/file-service";

const debug = makeDebug("server");

export function listen(port: number, deps: { fileService: FileService }): Promise<Server> {
  const app = createApp(deps.fileService);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      debug(`Server is listening on port ${port}`);
      resolve(server);
    });

    server.on("error", (error) => {
      debug("Error starting the server: ", error);
      reject(error);
    });
  });
}
