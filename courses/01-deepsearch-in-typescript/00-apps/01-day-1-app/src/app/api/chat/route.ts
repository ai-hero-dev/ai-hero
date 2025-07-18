import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { model } from "~/model";
import { auth } from "~/server/auth/index.ts";
import { searchWeb } from "./search-web-tool";
import { checkRateLimit, upsertChat } from "~/server/db/queries";
import { nanoid } from "nanoid";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const rateLimitResult = await checkRateLimit(userId);
  if (!rateLimitResult.allowed) {
    return new Response(rateLimitResult.error || "Too Many Requests", {
      status: rateLimitResult.error === "Too Many Requests" ? 429 : 401,
    });
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId?: string;
    isNewChat?: boolean;
  };

  let { messages, chatId, isNewChat } = body;

  if (!chatId) {
    chatId = nanoid();
  }
  // isNewChat is now provided by the client, default to true if chatId was missing
  if (typeof isNewChat !== "boolean") {
    isNewChat = !body.chatId;
  }

  // Always create or update the chat before streaming, to ensure it exists
  // Use a default title for new chats
  await upsertChat({
    userId,
    chatId,
    title: messages.at(-1)?.content.slice(0, 10) ?? "New chat",
    messages,
  });

  return createDataStreamResponse({
    execute: async (dataStream) => {
      if (isNewChat) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId,
        });
      }
      const result = streamText({
        model,
        messages,
        tools: {
          searchWeb,
        },
        system: `You are a helpful AI assistant with access to a web search tool.

Please follow these guidelines:

- Always use the \`searchWeb\` tool to answer user questions.
- Be thorough in your answers, but concise.
- Always cite your sources with inline links, for example "The [answer](link) is...".
- Always respond in markdown and format the response in a clear, visually appealing way.

If you cannot answer, explain why.
`,
        maxSteps: 10,
        async onFinish({ response }) {
          // Merge the streamed response messages with the original messages
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages: response.messages,
          });

          // Save the updated messages to the database, replacing all previous messages
          await upsertChat({
            userId,
            chatId: chatId!,
            title: updatedMessages.at(-1)?.content.slice(0, 10) ?? "New Chat",
            messages: updatedMessages,
          });
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
