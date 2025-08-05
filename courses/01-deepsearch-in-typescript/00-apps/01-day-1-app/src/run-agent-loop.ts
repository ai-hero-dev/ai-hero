import { bulkCrawlWebsites } from "./scraper";
import { searchSerper } from "./serper";
import { SystemContext } from "./system-context";
import { answerQuestion } from "./answer-question";
import { getNextAction, type OurMessageAnnotation } from "./get-next-action";
import type { StreamTextResult } from "ai";
import type { Message } from "ai";
import { streamText } from "ai";

type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

type ScrapeResult = {
  url: string;
  result: string;
};

const search = async (
  context: SystemContext,
  query: string,
): Promise<QueryResult[]> => {
  const searchResult = await searchSerper({ q: query, num: 10 }, undefined);

  const results: QueryResultSearchResult[] = searchResult.organic.map(
    (result) => ({
      date: result.date ?? new Date().toISOString(),
      title: result.title,
      url: result.link,
      snippet: result.snippet,
    }),
  );

  const queryResult: QueryResult = {
    query,
    results,
  };

  context.reportQueries([queryResult]);
  return [queryResult];
};

const scrapeUrl = async (
  context: SystemContext,
  urls: string[],
): Promise<ScrapeResult[]> => {
  const crawlResult = await bulkCrawlWebsites({ urls });

  if (!crawlResult.success) {
    throw new Error(crawlResult.error);
  }

  const scrapeResults: ScrapeResult[] = crawlResult.results.map((result) => ({
    url: result.url,
    result: result.result.data,
  }));

  context.reportScrapes(scrapeResults);
  return scrapeResults;
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
    } else if (nextAction.type === "scrape") {
      if (!nextAction.urls || nextAction.urls.length === 0) {
        throw new Error("Scrape action requires URLs");
      }
      await scrapeUrl(ctx, nextAction.urls);
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
