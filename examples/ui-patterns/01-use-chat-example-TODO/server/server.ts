import { smoothStream, streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { smallModel } from "../../../_shared/models.ts";
import { logger } from "hono/logger";

export const honoApp = new Hono();

honoApp.use(cors());
honoApp.use(logger());

honoApp.post("/api/chat", async (ctx) => {
  const { messages } = await ctx.req.json();

  const result = streamText({
    model: smallModel,
    messages,
    experimental_transform: smoothStream(),
  });

  return result.toDataStreamResponse();
});
