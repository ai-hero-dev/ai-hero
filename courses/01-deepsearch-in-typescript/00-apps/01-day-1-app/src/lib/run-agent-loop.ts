import type { streamText, StreamTextResult } from "ai";
import type { Message } from "ai";
import { searchSerper } from "~/lib/serper";
import { bulkCrawlWebsites } from "~/lib/scraper";
import { env } from "~/env";
import { SystemContext } from "./system-context";
import { getNextAction, type MessageAnnotation } from "./get-next-action";
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
  return bulkCrawlWebsites({ urls });
};

interface RunAgentLoopOptions {
  langfuseTraceId?: string;
}

export const runAgentLoop = async (
  messages: Message[],
  writeMessageAnnotation?: (annotation: MessageAnnotation) => void,
  opts?: RunAgentLoopOptions & {
    onFinish: Parameters<typeof streamText>[0]["onFinish"];
  },
): Promise<StreamTextResult<{}, string>> => {
  // A persistent container for the state of our system
  const ctx = new SystemContext(messages);

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (!ctx.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(ctx, opts);

    // Send annotation about the chosen action
    if (writeMessageAnnotation) {
      writeMessageAnnotation({
        type: "NEW_ACTION",
        action: {
          type: nextAction.type,
          title: nextAction.title,
          reasoning: nextAction.reasoning,
          query: nextAction.query,
          urls: nextAction.urls,
        },
      });
    }

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
      const lastMessage = messages[messages.length - 1];
      const userQuestion = lastMessage?.content || "";
      return answerQuestion(
        ctx,
        userQuestion,
        { isFinal: false, onFinish: opts?.onFinish },
        opts,
      );
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  const lastMessage = messages[messages.length - 1];
  const userQuestion = lastMessage?.content || "";
  return answerQuestion(
    ctx,
    userQuestion,
    { isFinal: true, onFinish: opts?.onFinish },
    opts,
  );
};
