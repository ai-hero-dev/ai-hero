import type { Message } from "ai";
import type { LocationInfo } from "./location-utils";

type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet?: string;
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
   * The full conversation messages
   */
  public messages: Message[];

  /**
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  /**
   * User's location information
   */
  private locationInfo?: LocationInfo;

  constructor(messages: Message[], locationInfo?: LocationInfo) {
    this.messages = messages;
    this.locationInfo = locationInfo;
  }

  shouldStop() {
    return this.step >= 10;
  }

  incrementStep() {
    this.step++;
  }

  getMessages(): string {
    const formattedMessages = this.messages
      .map((msg) => `<${msg.role}>${msg.content}</${msg.role}>`)
      .join("\n");
    return formattedMessages;
  }

  getLocationContext(): string {
    if (!this.locationInfo) {
      return "";
    }

    return `About the origin of user's request:
- lat: ${this.locationInfo.latitude || "unknown"}
- lon: ${this.locationInfo.longitude || "unknown"}
- city: ${this.locationInfo.city || "unknown"}
- country: ${this.locationInfo.country || "unknown"}
`;
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
