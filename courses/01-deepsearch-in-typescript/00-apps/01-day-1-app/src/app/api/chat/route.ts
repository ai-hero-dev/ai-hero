import type { Message } from "ai";
import {
  appendResponseMessages,
  createDataStreamResponse,
  streamText,
} from "ai";
import { z } from "zod";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "../../../server/auth";
import { model } from "../../../model";
import { searchSerper } from "../../../serper";
import { bulkCrawlWebsites } from "../../../scraper";
import { cacheWithRedis } from "../../../server/redis/redis";
import { upsertChat, getChat } from "../../../server/db/queries";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

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

  // Create Langfuse trace with user and session tracking
  const trace = langfuse.trace({
    sessionId: finalChatId,
    name: "chat",
    userId: session.user.id,
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

      const result = streamText({
        model,
        messages,
        maxSteps: 10,
        experimental_telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        system: `You are a helpful AI assistant that follows a specific workflow to provide accurate, detailed answers.

CURRENT DATE AND TIME: ${new Date().toISOString()}

When users ask for "up to date" information, current events, recent news, or anything time-sensitive, make sure to:
- Use the current date (${new Date().toLocaleDateString()}) as a reference point
- Prioritize the most recent information available
- Consider the publication dates of sources when determining what's "current"
- For time-sensitive queries like weather, sports scores, or breaking news, emphasize the importance of real-time data
- The search results include publication dates - use these to identify the most current information

WORKFLOW:
1. Use searchWeb to find relevant URLs that contain information related to the user's question
2. Use scrapePages to get the full content of 4-6 diverse URLs from different sources
3. Use the full content to provide detailed, accurate answers with proper citations

When users ask questions that require current or detailed information, follow this workflow:
- First, search for relevant web pages using searchWeb
- Then, scrape the full content of 4-6 diverse URLs from different sources using scrapePages
- Finally, provide comprehensive answers based on the full content you've gathered

IMPORTANT GUIDELINES:
- Always scrape 4-6 URLs per query to ensure comprehensive coverage
- Prioritize diverse sources - avoid scraping multiple pages from the same domain
- Look for authoritative sources, news sites, academic sources, and different perspectives
- When scraping, select URLs that appear to be from different websites/organizations
- Pay attention to publication dates when users ask for current information

This approach ensures you have complete information from multiple perspectives rather than just snippets, leading to more accurate and detailed responses.

IMPORTANT: Always format ALL links as Markdown links using the [text](url) format. This includes:
- Links from web search results
- Any URLs you reference in your responses
- Links to sources, articles, or websites

Never use plain URLs or HTML links. Always use the Markdown format: [descriptive text](url)

Be conversational and helpful, but always back up your claims with sources when using web search results.

When discussing current events or time-sensitive information, you can reference the current date to provide context about how recent the information is.`,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 15 },
                abortSignal,
              );

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
                date: result.date,
              }));
            },
          },
          scrapePages: {
            parameters: z.object({
              urls: z
                .array(z.string())
                .describe(
                  "Array of URLs to scrape and extract full content from",
                ),
            }),
            execute: cacheWithRedis(
              "scrapePages",
              async (
                { urls }: { urls: string[] },
                { abortSignal }: { abortSignal?: AbortSignal },
              ) => {
                const result = await bulkCrawlWebsites({ urls });

                if (!result.success) {
                  return {
                    error: result.error,
                    results: result.results.map((r) => ({
                      url: r.url,
                      success: r.result.success,
                      data: r.result.success ? r.result.data : r.result.error,
                    })),
                  };
                }

                return {
                  results: result.results.map((r) => ({
                    url: r.url,
                    success: r.result.success,
                    data: r.result.data,
                  })),
                };
              },
            ),
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

          // Flush the trace to Langfuse
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
