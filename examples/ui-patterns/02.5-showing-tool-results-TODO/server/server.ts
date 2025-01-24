import { smoothStream, streamText, tool } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
import { smallToolCallingModel } from "../../../_shared/models.ts";
import { readdir } from "node:fs/promises";

export const honoApp = new Hono();

honoApp.use(cors());
honoApp.use(logger());

honoApp.post("/api/chat", async (ctx) => {
  const { messages } = await ctx.req.json();

  const result = streamText({
    model: smallToolCallingModel,
    messages: messages,
    system:
      `You manage a set of files on the file system. ` +
      `You can read the files in a directory. ` +
      `The current directory is ${process.cwd()}. `,
    experimental_transform: smoothStream(),
    tools: {
      readdir: tool({
        parameters: z.object({
          dirPath: z.string(),
        }),
        description: `Read the directory of files.`,
        execute: async ({ dirPath }) => {
          return readdir(dirPath, {
            recursive: true,
          });
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
});
