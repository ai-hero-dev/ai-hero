import path from "node:path";
import { createServer } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { Hono } from "hono";
import {
  serve,
  type ServerType,
} from "@hono/node-server";
import { once } from "node:events";

export const runLocalDevServer = async (opts: {
  root: string;
  honoApp?: Hono;
}) => {
  let honoServer: ServerType | undefined;

  if (opts.honoApp) {
    honoServer = serve({
      fetch: opts.honoApp.fetch,
      port: 4317,
      hostname: "0.0.0.0",
    });

    await once(honoServer, "listening");
  }
  const viteServer = await createServer({
    configFile: false,
    server: {
      port: 3000,
      open: true,
    },
    plugins: [tailwindcss()],
    root: path.join(opts.root, "client"),
  });

  await viteServer.listen();

  viteServer.printUrls();

  return {
    close: () => {
      viteServer.close();
      honoServer?.close();
    },
  };
};
