import { cacheWithRedis } from "~/server/redis/redis";

export declare namespace SerperTool {
  export type SearchInput = {
    q: string;
    num: number;
  };

  export interface SearchParameters {
    q: string;
    type: string;
    engine: string;
  }

  export interface KnowledgeGraph {
    title: string;
    type: string;
    rating?: number;
    ratingCount?: number;
    imageUrl?: string;
    attributes?: Record<string, string>;
  }

  export interface Sitelink {
    title: string;
    link: string;
  }

  export interface OrganicResult {
    title: string;
    link: string;
    snippet: string;
    sitelinks?: Sitelink[];
    position: number;
    date?: string;
  }

  export interface PeopleAlsoAskResult {
    question: string;
    snippet: string;
    title: string;
    link: string;
  }

  export interface RelatedSearch {
    query: string;
  }

  export interface SearchResult {
    searchParameters: SearchParameters;
    knowledgeGraph?: KnowledgeGraph;
    organic: OrganicResult[];
    peopleAlsoAsk?: PeopleAlsoAskResult[];
    relatedSearches?: RelatedSearch[];
    credits: number;
  }
}

const fetchFromSerper = cacheWithRedis(
  "serper",
  async (
    url: string,
    options: Omit<RequestInit, "headers"> & { signal: AbortSignal | undefined },
  ): Promise<SerperTool.SearchResult> => {
    if (!process.env.SERPER_API_KEY) {
      throw new Error("SERPER_API_KEY is not set in .env");
    }

    const response = await fetch(`https://google.serper.dev${url}`, {
      ...options,
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const json = await response.json();

    return json;
  },
);

export const searchSerper = async (
  body: SerperTool.SearchInput,
  signal: AbortSignal | undefined,
) => {
  const results = await fetchFromSerper(`/search`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });

  return results;
};
