import type { Message } from "ai";
import {
  appendResponseMessages,
  createDataStreamResponse,
  streamText,
} from "ai";
import { z } from "zod";
import { auth } from "../../../server/auth";
import { model } from "../../../model";
import { searchSerper } from "../../../serper";
import { upsertChat, getChat } from "../../../server/db/queries";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId?: string;
  };

  const { messages, chatId } = body;
  const userId = session.user.id;

  if (!messages?.length) {
    return new Response("No messages provided", { status: 400 });
  }

  // Generate a chat ID if none provided
  const finalChatId = chatId ?? crypto.randomUUID();

  // If chatId is provided, verify it belongs to the current user
  if (chatId) {
    const existingChat = await getChat({ userId, chatId });
    if (!existingChat) {
      return new Response("Chat not found or access denied", { status: 404 });
    }
  }

  // Create a title from the first user message
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  const title = firstUserMessage?.content?.slice(0, 100) || "New Chat";

  // Create the chat before starting the stream to avoid issues with long-running streams
  if (!chatId) {
    await upsertChat({
      userId,
      chatId: finalChatId,
      title,
      messages,
    });
  }

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // If this is a new chat, send the chat ID to the frontend
      if (!chatId) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: finalChatId,
        });
      }

      const result = streamText({
        model,
        messages,
        maxSteps: 10,
        system: `You are a helpful AI assistant that can search the web for current information. 

When users ask questions that might benefit from current information, you should use the searchWeb tool to find relevant and up-to-date information.

IMPORTANT: Always format ALL links as Markdown links using the [text](url) format. This includes:
- Links from web search results
- Any URLs you reference in your responses
- Links to sources, articles, or websites

Never use plain URLs or HTML links. Always use the Markdown format: [descriptive text](url)

If a user asks about current events, recent developments, or anything that might have changed recently, use the search tool to get the latest information.

Be conversational and helpful, but always back up your claims with sources when using web search results.`,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              );

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
              }));
            },
          },
        },
        onFinish: async ({ text, finishReason, usage, response }) => {
          const responseMessages = response.messages;

          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });

          // Save the complete message history to the database
          await upsertChat({
            userId,
            chatId: finalChatId,
            title,
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
