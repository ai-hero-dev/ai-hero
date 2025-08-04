import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./model";
import type { SystemContext } from "./system-context";

export interface SearchAction {
  type: "search";
  query: string;
}

export interface ScrapeAction {
  type: "scrape";
  urls: string[];
}

export interface AnswerAction {
  type: "answer";
}

export type Action = SearchAction | ScrapeAction | AnswerAction;

export const actionSchema = z.object({
  type: z.enum(["search", "scrape", "answer"]).describe(
    `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  query: z
    .string()
    .describe("The query to search for. Required if type is 'search'.")
    .optional(),
  urls: z
    .array(z.string())
    .describe("The URLs to scrape. Required if type is 'scrape'.")
    .optional(),
});

export const getNextAction = async (context: SystemContext) => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a helpful AI assistant that follows a specific workflow to provide accurate, detailed answers.
      CURRENT DATE AND TIME: ${new Date().toISOString()}`,
    prompt: `
    Based on the current context, choose the next action:
      - If you need more information, choose "search" with an appropriate query
      - If you have search results but need to scrape URLs for detailed content, choose "scrape" with the URLs to scrape
      - If you have enough information to answer the user's question, choose "answer"
    
    Here is the current context:

    ${context.getQueryHistory()}

    ${context.getScrapeHistory()}`,
  });

  return result.object;
};
