import { bulkCrawlWebsites } from "./scraper";
import { searchSerper } from "./serper";
import { SystemContext } from "./system-context";
import { answerQuestion } from "./answer-question";
import { getNextAction, type OurMessageAnnotation } from "./get-next-action";
import type { StreamTextResult } from "ai";
import type { Message } from "ai";
import { streamText } from "ai";

type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  scrapedContent: string;
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

const search = async (
  context: SystemContext,
  query: string,
): Promise<SearchHistoryEntry[]> => {
  // Search for information with fewer results to reduce context window usage
  const searchResult = await searchSerper({ q: query, num: 3 }, undefined);

  // Extract search results
  const searchResults = searchResult.organic.map((result) => ({
    date: result.date ?? new Date().toISOString(),
    title: result.title,
    url: result.link,
    snippet: result.snippet,
    scrapedContent: "", // Will be populated after scraping
  }));

  // Scrape all URLs to get detailed content
  const urls = searchResults.map((result) => result.url);
  const crawlResult = await bulkCrawlWebsites({ urls });

  if (!crawlResult.success) {
    throw new Error(crawlResult.error);
  }

  // Combine search results with scraped content
  const combinedResults: SearchResult[] = searchResults.map(
    (result, index) => ({
      ...result,
      scrapedContent:
        crawlResult.results[index]?.result.data || "Failed to scrape content",
    }),
  );

  const searchHistoryEntry: SearchHistoryEntry = {
    query,
    results: combinedResults,
  };

  context.reportSearch(searchHistoryEntry);
  return [searchHistoryEntry];
};

export async function runAgentLoop(
  messages: Message[],
  opts: {
    writeMessageAnnotation: (annotation: OurMessageAnnotation) => void;
    langfuseTraceId?: string;
    onFinish?: Parameters<typeof streamText>[0]["onFinish"];
  },
): Promise<StreamTextResult<Record<string, never>, string>> {
  const ctx = new SystemContext(messages);

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (!ctx.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(ctx, opts.langfuseTraceId);

    // Send progress update to the frontend
    opts.writeMessageAnnotation({
      type: "NEW_ACTION",
      action: nextAction,
    });

    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      if (!nextAction.query) {
        throw new Error("Search action requires a query");
      }
      await search(ctx, nextAction.query);
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, {}, opts.onFinish, opts.langfuseTraceId);
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(
    ctx,
    { isFinal: true },
    opts.onFinish,
    opts.langfuseTraceId,
  );
}
