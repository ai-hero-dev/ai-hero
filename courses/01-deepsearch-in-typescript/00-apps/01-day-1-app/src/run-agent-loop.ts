import { bulkCrawlWebsites } from "./scraper";
import { searchSerper } from "./serper";
import { SystemContext } from "./system-context";
import { answerQuestion } from "./answer-question";
import { getNextAction, type OurMessageAnnotation } from "./get-next-action";
import { queryRewriter } from "./query-rewriter";
import type { StreamTextResult } from "ai";
import type { Message } from "ai";
import { streamText } from "ai";
import { summarizeURL } from "./summarize-url";

type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  summary: string;
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

const search = async (
  context: SystemContext,
  query: string,
  langfuseTraceId?: string,
): Promise<SearchHistoryEntry[]> => {
  // Search for information with fewer results to reduce context window usage
  const searchResult = await searchSerper({ q: query, num: 5 }, undefined);

  // Extract search results and filter out Reddit URLs to avoid robots.txt issues
  const searchResults = searchResult.organic
    .filter((result) => !result.link.includes("reddit.com"))
    .map((result) => ({
      date: result.date ?? new Date().toISOString(),
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      scrapedContent: "", // Will be populated after scraping
    }));

  // If no valid URLs remain after filtering, return empty results
  if (searchResults.length === 0) {
    console.warn(
      `No valid URLs found for query: ${query} (all results were Reddit URLs)`,
    );
    const searchHistoryEntry: SearchHistoryEntry = {
      query,
      results: [],
    };
    context.reportSearch(searchHistoryEntry);
    return [searchHistoryEntry];
  }

  // Scrape all URLs to get detailed content
  const urls = searchResults.map((result) => result.url);
  const crawlResult = await bulkCrawlWebsites({ urls });

  // Handle failed crawls gracefully
  if (!crawlResult.success) {
    console.warn(
      `Failed to crawl some websites for query: ${query}`,
      crawlResult.error,
    );

    // Create results with empty scraped content for failed crawls
    const combinedResults = searchResults.map((result, index) => ({
      ...result,
      scrapedContent: crawlResult.results[index]?.result.success
        ? crawlResult.results[index]!.result.data
        : "Failed to scrape content",
    }));

    // Continue with summarization even if some crawls failed
    const conversationHistory = context.getConversationHistory();
    const summaryPromises = combinedResults.map(async (result) => {
      try {
        const summary = await summarizeURL({
          conversationHistory,
          scrapedContent: result.scrapedContent,
          searchMetadata: {
            date: result.date,
            title: result.title,
            url: result.url,
            snippet: result.snippet,
          },
          query,
          langfuseTraceId,
        });
        return {
          date: result.date,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          summary,
        };
      } catch (error) {
        console.error(`Failed to summarize ${result.url}:`, error);
        return {
          date: result.date,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          summary: "Failed to generate summary",
        };
      }
    });

    const summarizedResults = await Promise.all(summaryPromises);

    const searchHistoryEntry: SearchHistoryEntry = {
      query,
      results: summarizedResults,
    };

    context.reportSearch(searchHistoryEntry);
    return [searchHistoryEntry];
  }

  // Combine search results with scraped content
  const combinedResults = searchResults.map((result, index) => ({
    ...result,
    scrapedContent:
      crawlResult.results[index]?.result.data || "Failed to scrape content",
  }));

  // Summarize all URLs in parallel
  const conversationHistory = context.getConversationHistory();
  const summaryPromises = combinedResults.map(async (result) => {
    try {
      const summary = await summarizeURL({
        conversationHistory,
        scrapedContent: result.scrapedContent,
        searchMetadata: {
          date: result.date,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        },
        query,
        langfuseTraceId,
      });
      return {
        date: result.date,
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        summary,
      };
    } catch (error) {
      console.error(`Failed to summarize ${result.url}:`, error);
      return {
        date: result.date,
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        summary: "Failed to generate summary",
      };
    }
  });

  const summarizedResults = await Promise.all(summaryPromises);

  const searchHistoryEntry: SearchHistoryEntry = {
    query,
    results: summarizedResults,
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
    // 1. Run the query rewriter to generate search queries
    const queryPlan = await queryRewriter(ctx, opts.langfuseTraceId);

    // Send planning annotation to frontend
    opts.writeMessageAnnotation({
      type: "NEW_ACTION",
      action: {
        type: "continue",
        title: "Planning search strategy",
        reasoning: `Generated ${queryPlan.queries.length} search queries based on research plan: ${queryPlan.plan}`,
        feedback: `Research plan: ${queryPlan.plan}`,
      },
    });

    // 2. Search based on the queries
    const searchPromises = queryPlan.queries.map((query) =>
      search(ctx, query, opts.langfuseTraceId),
    );

    await Promise.all(searchPromises);

    // 3. Save to context (this is done automatically in the search function via context.reportSearch)

    // 4. Decide whether to continue by calling getNextAction
    const nextAction = await getNextAction(ctx, opts.langfuseTraceId);

    // Store the evaluator feedback in context for the next iteration (only for continue actions)
    if (nextAction.type === "continue" && nextAction.feedback) {
      ctx.setEvaluatorFeedback(nextAction.feedback);
    }

    // Send action decision annotation to frontend
    opts.writeMessageAnnotation({
      type: "NEW_ACTION",
      action: nextAction,
    });

    // If we have an answer, return it
    if (nextAction.type === "answer") {
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
