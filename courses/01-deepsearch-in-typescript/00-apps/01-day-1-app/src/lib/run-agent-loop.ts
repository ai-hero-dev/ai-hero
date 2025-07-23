import type { StreamTextResult } from "ai";
import { searchSerper } from "~/lib/serper";
import { bulkCrawlWebsites } from "~/lib/scraper";
import { env } from "~/env";
import { SystemContext } from "./system-context";
import { getNextAction } from "./get-next-action";
import { answerQuestion } from "./answer-question";

// Copy of the search function from tools.ts
const searchWeb = async (query: string) => {
  const results = await searchSerper(
    { q: query, num: env.SEARCH_RESULTS_COUNT },
    undefined,
  );
  return results.organic.map((result) => ({
    title: result.title,
    link: result.link,
    snippet: result.snippet,
    date: result.date,
  }));
};

// Copy of the scrape function from tools.ts
const scrapePages = async (urls: string[]) => {
  const result = await bulkCrawlWebsites({ urls });
  return result;
};

export const runAgentLoop = async (
  userQuestion: string,
): Promise<StreamTextResult<{}, string>> => {
  // A persistent container for the state of our system
  const ctx = new SystemContext(userQuestion);

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (!ctx.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(ctx);

    // We execute the action and update the state of our system
    if (nextAction.type === "search" && nextAction.query) {
      const searchResults = await searchWeb(nextAction.query);
      ctx.reportQueries([
        {
          query: nextAction.query,
          results: searchResults.map((result) => ({
            date: result.date || "",
            title: result.title,
            url: result.link,
            snippet: result.snippet,
          })),
        },
      ]);
    } else if (nextAction.type === "scrape" && nextAction.urls) {
      const scrapeResults = await scrapePages(nextAction.urls);
      if (scrapeResults.success) {
        ctx.reportScrapes(
          scrapeResults.results.map((result) => ({
            url: result.url,
            result: result.result.data,
          })),
        );
      }
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, userQuestion);
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(ctx, userQuestion, { isFinal: true });
};
