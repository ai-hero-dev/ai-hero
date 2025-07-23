import type { Message } from "ai";
import { createDataStreamResponse, appendResponseMessages } from "ai";
import { auth } from "~/server/auth/index.ts";
import { checkRateLimit, upsertChat } from "~/server/db/queries";
import { nanoid } from "nanoid";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { streamFromDeepSearch } from "./deep-search";
import type { MessageAnnotation } from "~/lib/get-next-action";

type OurMessageAnnotation = MessageAnnotation;

export const maxDuration = 60;

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

  // --- DB CALL: checkRateLimit (user-specific) ---
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

      // Collect annotations in memory
      const annotations: OurMessageAnnotation[] = [];

      const writeMessageAnnotation = (annotation: OurMessageAnnotation) => {
        // Save the annotation in-memory
        annotations.push(annotation);
        // Send it to the client
        dataStream.writeMessageAnnotation(annotation);
      };

      const result = await streamFromDeepSearch({
        messages,
        onFinish: async ({ response }) => {
          // Get the last message
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages: response.messages,
          });

          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (!lastMessage) {
            return;
          }

          // Add the annotations to the last message
          lastMessage.annotations = annotations;

          // Upsert the chat and its messages
          await upsertChat({
            userId,
            chatId: chatId!,
            title: messages.at(-1)?.content.slice(0, 10) ?? "New Chat",
            messages: updatedMessages,
          });
        },
        writeMessageAnnotation,
        langfuseTraceId: trace.id,
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
