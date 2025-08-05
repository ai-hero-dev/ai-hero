import type { Message } from "ai";
import { appendResponseMessages, createDataStreamResponse } from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "../../../server/auth";
import { streamFromDeepSearch } from "../../../deep-search";
import { upsertChat, getChat } from "../../../server/db/queries";
import { checkRateLimit, recordRateLimit } from "../../../server/rate-limit";
import type { OurMessageAnnotation } from "../../../get-next-action";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Rate limiting configuration for testing
  const rateLimitConfig = {
    maxRequests: 10,
    maxRetries: 3,
    windowMs: 60_000, // 1 minute
    keyPrefix: "chat",
  };

  // Check the rate limit
  const rateLimitCheck = await checkRateLimit(rateLimitConfig);

  if (!rateLimitCheck.allowed) {
    console.log("Rate limit exceeded, waiting...");
    const isAllowed = await rateLimitCheck.retry();
    // If the rate limit is still exceeded, return a 429
    if (!isAllowed) {
      return new Response("Rate limit exceeded", {
        status: 429,
      });
    }
  }

  // Record the request
  await recordRateLimit(rateLimitConfig);

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

  // Create Langfuse trace with user and session tracking
  const trace = langfuse.trace({
    name: "chat",
    userId: session.user.id,
  });

  // If chatId is provided, verify it belongs to the current user
  if (chatId) {
    const verifyChatSpan = trace.span({
      name: "verify-chat-ownership",
      input: {
        userId,
        chatId,
      },
    });

    const existingChat = await getChat({ userId, chatId });

    verifyChatSpan.end({
      output: {
        chatFound: !!existingChat,
        chatId,
      },
    });

    if (!existingChat) {
      return new Response("Chat not found or access denied", { status: 404 });
    }
  }

  // Create a title from the first user message
  const firstUserMessage = messages.find((msg) => msg.role === "user");
  const title = firstUserMessage?.content?.slice(0, 100) ?? "New Chat";

  // Create the chat before starting the stream to avoid issues with long-running streams
  if (!chatId) {
    const createChatSpan = trace.span({
      name: "create-new-chat",
      input: {
        userId,
        chatId: finalChatId,
        title,
        messageCount: messages.length,
      },
    });

    await upsertChat({
      userId,
      chatId: finalChatId,
      title,
      messages,
    });

    createChatSpan.end({
      output: {
        chatId: finalChatId,
        title,
        messageCount: messages.length,
      },
    });
  }

  // Update trace with sessionId now that we have the final chat ID
  trace.update({
    sessionId: finalChatId,
  });

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // If this is a new chat, send the chat ID to the frontend
      if (!chatId) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: finalChatId,
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

      // Wait for the result
      const result = await streamFromDeepSearch({
        messages,
        onFinish: async ({ finishReason, usage, response }) => {
          const responseMessages = response.messages;

          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });

          // Get the last message and add annotations to it
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage) {
            (lastMessage as any).annotations = annotations;
          }

          // Save the complete message history to the database
          const saveMessagesSpan = trace.span({
            name: "save-complete-message-history",
            input: {
              userId,
              chatId: finalChatId,
              title,
              originalMessageCount: messages.length,
              responseMessageCount: responseMessages.length,
              totalMessageCount: updatedMessages.length,
              annotationCount: annotations.length,
            },
          });

          await upsertChat({
            userId,
            chatId: finalChatId,
            title,
            messages: updatedMessages,
          });

          saveMessagesSpan.end({
            output: {
              chatId: finalChatId,
              totalMessageCount: updatedMessages.length,
              annotationCount: annotations.length,
              finishReason,
              usage,
            },
          });

          // Flush the trace to Langfuse
          await langfuse.flushAsync();
        },
        langfuseTraceId: trace.id,
        writeMessageAnnotation,
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
