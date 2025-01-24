import { smoothStream, streamText, tool } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
import { smallToolCallingModel } from "../../../_shared/models.ts";

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
      `You can delete files. `,
    experimental_transform: smoothStream(),
    tools: {
      deleteFile: tool({
        parameters: z.object({
          filePath: z.string(),
        }),
        description: `Delete a file on the file system.`,
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
});

const tools: Record<
  string,
  (args: any) => Promise<any>
> = {
  deleteFile: async (args: { filePath: string }) => {
    return `File deleted`;
  },
};

honoApp.post("/api/call-tool", async (ctx) => {
  const { toolName, args } = await ctx.req.json();

  const result = await tools[toolName]?.(args);

  return ctx.json(result);
});
