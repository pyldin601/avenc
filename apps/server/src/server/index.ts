import { Server } from "node:http";
import { createApp } from "./app";
import makeDebug from "debug";

const debug = makeDebug("server");

export function listen(port: number): Promise<Server> {
  const app = createApp();

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
