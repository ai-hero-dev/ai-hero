import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { model } from "~/model";
import { auth } from "~/server/auth/index.ts";
import { searchWeb, scrapePages } from "./search-web-tool";
import { checkRateLimit, upsertChat } from "~/server/db/queries";
import { nanoid } from "nanoid";
import { Langfuse } from "langfuse";
import { env } from "~/env";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to a web search tool and a web page scraping tool.

Today is ${new Date().toISOString()}.
When the user asks for up-to-date information, use this date to inform your answer and cite when the information was last updated.

Please follow these guidelines:

- Always use the \`searchWeb\` tool to answer user questions.
- After calling the searchWeb tool, you must always use the \`scrapePages\` tool to fetch the full content of web pages before showing any results to the user. Do not show any results or summaries until you have scraped the relevant pages.
- When using the \`scrapePages\` tool, always scrape a LOT of websites (at least 4 to 6 per query) and use a diverse set of sources. Do not just scrape one or two sites, and do not use only a single domain. Try to include a mix of news, blogs, official sources, and community sites if possible.
- Be thorough in your answers, but concise.
- Always cite your sources.
- Always respond in markdown and format the response in a clear, visually appealing way.

A typical workflow would be:
1. User asks a question.
2. Use the \`searchWeb\` tool to find relevant web pages.
3. Use the \`scrapePages\` tool to fetch full content of those pages (at least 4 to 6, from diverse sources).
4. Analyze the content and provide a comprehensive answer.
- If the user asks for a specific piece of information, try to find it in the scraped content.  

If you cannot answer, explain why.
`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const langfuse = new Langfuse({
    environment: env.NODE_ENV,
  });
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

  // Create the trace after chatId is set
  const trace = langfuse.trace({
    sessionId: chatId ?? undefined,
    name: "chat",
    userId: userId,
  });

  // --- DB CALL: checkRateLimit ---
  const checkRateLimitSpan = trace.span({
    name: "db-check-rate-limit",
    input: { userId },
  });
  let rateLimitResult;
  try {
    rateLimitResult = await checkRateLimit(userId);
    checkRateLimitSpan.end({ output: rateLimitResult });
  } catch (error) {
    checkRateLimitSpan.end({ output: { error: String(error) } });
    throw error;
  }
  if (!rateLimitResult.allowed) {
    return new Response(rateLimitResult.error || "Too Many Requests", {
      status: rateLimitResult.error === "Too Many Requests" ? 429 : 401,
    });
  }

  // --- DB CALL: upsertChat (initial) ---
  const upsertChatInitialSpan = trace.span({
    name: "db-upsert-chat-initial",
    input: {
      userId,
      chatId,
      title: messages.at(-1)?.content.slice(0, 10) ?? "New chat",
      messages,
    },
  });
  try {
    await upsertChat({
      userId,
      chatId,
      title: messages.at(-1)?.content.slice(0, 10) ?? "New chat",
      messages,
    });
    upsertChatInitialSpan.end({ output: { success: true } });
  } catch (error) {
    upsertChatInitialSpan.end({ output: { error: String(error) } });
    throw error;
  }
  // If chatId was generated, update the trace's sessionId
  trace.update({ sessionId: chatId });

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
          scrapePages,
        },
        system: SYSTEM_PROMPT,
        maxSteps: 10,
        experimental_telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        async onFinish({ response }) {
          // Merge the streamed response messages with the original messages
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages: response.messages,
          });

          // --- DB CALL: upsertChat (final) ---
          const upsertChatFinalSpan = trace.span({
            name: "db-upsert-chat-final",
            input: {
              userId,
              chatId: chatId!,
              title: updatedMessages.at(-1)?.content.slice(0, 10) ?? "New Chat",
              messages: updatedMessages,
            },
          });
          try {
            await upsertChat({
              userId,
              chatId: chatId!,
              title: updatedMessages.at(-1)?.content.slice(0, 10) ?? "New Chat",
              messages: updatedMessages,
            });
            upsertChatFinalSpan.end({ output: { success: true } });
          } catch (error) {
            upsertChatFinalSpan.end({ output: { error: String(error) } });
            throw error;
          }
          await langfuse.flushAsync();
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
