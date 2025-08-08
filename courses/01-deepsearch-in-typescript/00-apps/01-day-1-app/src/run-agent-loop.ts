import { bulkCrawlWebsites } from "./scraper";
import { searchSerper } from "./serper";
import { SystemContext } from "./system-context";
import { answerQuestion } from "./answer-question";
import {
  getNextAction,
  type OurMessageAnnotation,
  type SourceItem,
} from "./get-next-action";
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

// Helper function to extract favicon URL from a website URL
const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
  } catch {
    return "";
  }
};

// New type for search results before scraping
type RawSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  query: string;
};

const fetchSearchResults = async (
  query: string,
  langfuseTraceId?: string,
): Promise<RawSearchResult[]> => {
  // Search for information with fewer results to reduce context window usage
  const searchResult = await searchSerper({ q: query, num: 5 }, undefined);

  // Extract search results and filter out Reddit URLs to avoid robots.txt issues
  return searchResult.organic
    .filter((result) => !result.link.includes("reddit.com"))
    .map((result) => ({
      date: result.date ?? new Date().toISOString(),
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      query,
    }));
};

const processSearchResults = async (
  context: SystemContext,
  searchResults: RawSearchResult[],
  langfuseTraceId?: string,
): Promise<SearchHistoryEntry[]> => {
  // If no valid URLs remain after filtering, return empty results
  if (searchResults.length === 0) {
    console.warn("No valid URLs found in search results");
    return [];
  }

  // Scrape all URLs to get detailed content
  const urls = searchResults.map((result) => result.url);
  const crawlResult = await bulkCrawlWebsites({ urls });

  // Handle failed crawls gracefully
  if (!crawlResult.success) {
    console.warn("Failed to crawl some websites", crawlResult.error);

    // Create results with empty scraped content for failed crawls
    const combinedResults = searchResults.map((result, index) => ({
      ...result,
      scrapedContent: crawlResult.results[index]?.result.success
        ? crawlResult.results[index]!.result.data
        : "Failed to scrape content",
    }));

    return await summarizeAndGroupResults(
      combinedResults,
      context,
      langfuseTraceId,
    );
  }

  // Combine search results with scraped content
  const combinedResults = searchResults.map((result, index) => ({
    ...result,
    scrapedContent:
      crawlResult.results[index]?.result.data || "Failed to scrape content",
  }));

  return await summarizeAndGroupResults(
    combinedResults,
    context,
    langfuseTraceId,
  );
};

const summarizeAndGroupResults = async (
  combinedResults: (RawSearchResult & { scrapedContent: string })[],
  context: SystemContext,
  langfuseTraceId?: string,
): Promise<SearchHistoryEntry[]> => {
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
        query: result.query,
        langfuseTraceId,
      });
      return {
        date: result.date,
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        summary,
        query: result.query,
      };
    } catch (error) {
      console.error(`Failed to summarize ${result.url}:`, error);
      return {
        date: result.date,
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        summary: "Failed to generate summary",
        query: result.query,
      };
    }
  });

  const summarizedResults = await Promise.all(summaryPromises);

  // Group results by query
  const resultsByQuery = summarizedResults.reduce<
    Record<string, SearchResult[]>
  >((acc, result) => {
    if (!acc[result.query]) {
      acc[result.query] = [];
    }
    acc[result.query]!.push({
      date: result.date,
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      summary: result.summary,
    });
    return acc;
  }, {});

  // Create search history entries and report to context
  const searchHistoryEntries: SearchHistoryEntry[] = [];
  for (const [query, results] of Object.entries(resultsByQuery)) {
    const searchHistoryEntry: SearchHistoryEntry = {
      query,
      results,
    };
    context.reportSearch(searchHistoryEntry);
    searchHistoryEntries.push(searchHistoryEntry);
  }

  return searchHistoryEntries;
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

    // 2. Fetch search results from all queries in parallel
    const searchPromises = queryPlan.queries.map((query) =>
      fetchSearchResults(query, opts.langfuseTraceId),
    );

    const allRawResults = await Promise.all(searchPromises);
    const flatResults = allRawResults.flat();

    // 3. Deduplicate results by URL
    const uniqueResults = flatResults.reduce<RawSearchResult[]>(
      (acc, current) => {
        const exists = acc.find((item) => item.url === current.url);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      },
      [],
    );

    // 4. Send sources annotation to frontend
    if (uniqueResults.length > 0) {
      const sources: SourceItem[] = uniqueResults.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        favicon: getFaviconUrl(result.url),
      }));

      opts.writeMessageAnnotation({
        type: "SOURCES",
        query: queryPlan.queries.join(", "),
        sources,
      });
    }

    // 5. Process the search results (scrape, summarize, and report to context)
    await processSearchResults(ctx, uniqueResults, opts.langfuseTraceId);

    // 6. Decide whether to continue by calling getNextAction
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
