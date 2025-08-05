import type { Message } from "ai";

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

const toQueryResult = (query: QueryResultSearchResult) =>
  [`### ${query.date} - ${query.title}`, query.url, query.snippet].join("\n\n");

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The full conversation history
   */
  private messages: Message[];

  /**
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  constructor(messages: Message[]) {
    this.messages = messages;
  }

  getInitialQuestion(): string {
    // Get the last user message as the current question
    const lastUserMessage = this.messages
      .filter((msg) => msg.role === "user")
      .pop();

    if (!lastUserMessage) return "";

    // Extract text content from parts
    return (
      lastUserMessage.parts
        ?.filter((part) => part.type === "text")
        .map((part) => (part as { type: "text"; text: string }).text)
        .join("") || ""
    );
  }

  getCurrentQuestion(): string {
    // For follow-up questions, we need to provide more context
    const lastUserMessage = this.messages
      .filter((msg) => msg.role === "user")
      .pop();

    if (!lastUserMessage) return "";

    // Extract text content from parts
    const extractTextContent = (msg: Message) => {
      return (
        msg.parts
          ?.filter((part) => part.type === "text")
          .map((part) => (part as { type: "text"; text: string }).text)
          .join("") || ""
      );
    };

    // If this is a follow-up question (like "that's not working"),
    // we need to include the previous conversation context
    const userMessages = this.messages.filter((msg) => msg.role === "user");

    if (userMessages.length > 1) {
      // This is a follow-up question, include previous context
      const previousUserMessage = userMessages[userMessages.length - 2];
      if (previousUserMessage) {
        return `Previous question: ${extractTextContent(previousUserMessage)}\n\nCurrent follow-up: ${extractTextContent(lastUserMessage)}`;
      }
    }

    return extractTextContent(lastUserMessage);
  }

  getConversationHistory(): string {
    return this.messages
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        // Extract text content from parts
        const textContent =
          msg.parts
            ?.filter((part) => part.type === "text")
            .map((part) => (part as { type: "text"; text: string }).text)
            .join("") || "";
        return `${role}: ${textContent}`;
      })
      .join("\n\n");
  }

  shouldStop() {
    return this.step >= 10;
  }

  incrementStep() {
    this.step++;
  }

  reportQueries(queries: QueryResult[]) {
    this.queryHistory.push(...queries);
  }

  reportScrapes(scrapes: ScrapeResult[]) {
    this.scrapeHistory.push(...scrapes);
  }

  getQueryHistory(): string {
    return this.queryHistory
      .map((query) =>
        [
          `## Query: "${query.query}"`,
          ...query.results.map(toQueryResult),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getScrapeHistory(): string {
    return this.scrapeHistory
      .map((scrape) =>
        [
          `## Scrape: "${scrape.url}"`,
          `<scrape_result>`,
          scrape.result,
          `</scrape_result>`,
        ].join("\n\n"),
      )
      .join("\n\n");
  }
}
