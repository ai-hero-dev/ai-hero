import { streamText, type Message, type TelemetrySettings } from "ai";
import { z } from "zod";
import { model } from "./model";
import { searchSerper } from "./serper";
import { bulkCrawlWebsites } from "./scraper";
import { cacheWithRedis } from "./server/redis/redis";

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    experimental_telemetry: opts.telemetry,
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
            .describe("Array of URLs to scrape and extract full content from"),
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
    onFinish: opts.onFinish,
  });

export async function askDeepSearch(messages: Message[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
