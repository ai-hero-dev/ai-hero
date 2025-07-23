import type { Message } from "ai";
import { createDataStreamResponse, appendResponseMessages } from "ai";
import { auth } from "~/server/auth/index.ts";
import {
  checkRateLimit,
  upsertChat,
  generateChatTitle,
} from "~/server/db/queries";
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

  const titleToBe = startGeneratingTitle(isNewChat, messages);

  const newChat = {
    userId,
    chatId,
    title: "Generating...",
    messages,
  };

  const upsertChatInitialSpan = trace.span({
    name: "db-upsert-chat-initial",
    input: newChat,
  });
  try {
    await upsertChat(newChat);
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

          // Resolve the title promise
          const title = await titleToBe;

          // Upsert the chat and its messages with the generated title if available
          await upsertChat({
            userId,
            chatId: chatId!,
            messages: updatedMessages,
            title, // Only save the title if it's not empty
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

const startGeneratingTitle = (isNewChat: boolean, messages: Message[]) => {
  if (isNewChat) {
    return generateChatTitle(messages);
  }
  return Promise.resolve("");
};
