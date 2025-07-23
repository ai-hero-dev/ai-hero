import { z } from "zod";
import { generateObject } from "ai";
import { model } from "~/app/api/chat/model";
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
    system: `
You are a helpful assistant that can search the web, scrape a URL, or answer the user's question.

Your role is to choose the next action based on the available context.
`,
    prompt: `
The user's question is: "${context.getUserQuestion()}"

Based on the context, choose the next action:

- Use 'search' if you need more information to answer the question. If the there is no context, you should always use 'search'. Include the urls to scrape in the query.
- Use 'scrape' if when you have query results that need to be scraped for detailed information. You should always use 'scrape' when query results are insufficient to answer the question.
- Use 'answer' if you have enough information to provide a comprehensive answer

Here is the context:

${context.getQueryHistory()}

${context.getScrapeHistory()}
    `,
  });

  return result.object;
};
