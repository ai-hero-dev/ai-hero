import { z } from "zod";
import { searchSerper } from "~/lib/serper";
import { bulkCrawlWebsites } from "~/lib/scraper";
import { env } from "~/env";

export const searchWeb = {
  parameters: z.object({
    query: z.string().describe("The query to search the web for"),
  }),
  execute: async (
    { query }: { query: string },
    options: { abortSignal?: AbortSignal },
  ) => {
    const results = await searchSerper(
      { q: query, num: env.SEARCH_RESULTS_COUNT },
      options.abortSignal,
    );
    return results.organic.map((result) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet,
      date: result.date,
    }));
  },
};

export const scrapePages = {
  parameters: z.object({
    urls: z
      .array(z.string())
      .describe("A list of URLs to scrape for full page content."),
  }),
  execute: async (
    { urls }: { urls: string[] },
    _options: { abortSignal?: AbortSignal },
  ) => {
    const result = await bulkCrawlWebsites({ urls });
    return result;
  },
};
