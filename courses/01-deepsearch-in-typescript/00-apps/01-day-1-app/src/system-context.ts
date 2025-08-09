import type { Message } from "ai";

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

const toSearchResult = (result: SearchResult) =>
  [
    `### ${result.date} - ${result.title}`,
    result.url,
    result.snippet,
    `<summary>`,
    result.summary,
    `</summary>`,
  ].join("\n\n");

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
   * The history of all searches with their scraped content
   */
  private searchHistory: SearchHistoryEntry[] = [];

  /**
   * The most recent feedback from the evaluator
   */
  private evaluatorFeedback: string = "";

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

  getMessageHistory(): string {
    return this.messages
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        // Extract text content from parts
        const textContent =
          msg.parts
            ?.filter((part) => part.type === "text")
            .map((part) => (part as { type: "text"; text: string }).text)
            .join("") || "";
        return `<${role}>${textContent}</${role}>`;
      })
      .join("\n");
  }

  shouldStop() {
    return this.step >= 10;
  }

  incrementStep() {
    this.step++;
  }

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map(toSearchResult),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  setEvaluatorFeedback(feedback: string) {
    this.evaluatorFeedback = feedback;
  }

  getEvaluatorFeedback(): string {
    return this.evaluatorFeedback;
  }

  // Legacy methods for backward compatibility during transition
  getQueryHistory(): string {
    return this.getSearchHistory();
  }

  getScrapeHistory(): string {
    return this.getSearchHistory();
  }
}
