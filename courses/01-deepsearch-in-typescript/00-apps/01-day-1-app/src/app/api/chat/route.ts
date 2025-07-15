import type { Message } from "ai";
import { streamText, createDataStreamResponse } from "ai";
import { model } from "~/model";
import { auth } from "~/server/auth/index.ts";
import { searchSerper } from "~/serper";
import { z } from "zod";
import { searchWeb } from "./search-web-tool";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages } = body;

      const result = streamText({
        model,
        messages,
        tools: {
          searchWeb,
        },
        system: `You are a helpful AI assistant with access to a web search tool. 
        Always use the \`searchWeb\` tool to answer user questions.
        Always cite your sources with inline links.
        Make the link a nice readable part of the answer, not an http link.
        Always respond in markdown, format the response in a nice way.`,
        maxSteps: 10,
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
