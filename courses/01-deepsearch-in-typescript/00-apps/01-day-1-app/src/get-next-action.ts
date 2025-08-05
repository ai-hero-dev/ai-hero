import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./model";
import type { SystemContext } from "./system-context";

export interface SearchAction {
  type: "search";
  query: string;
  title: string;
  reasoning: string;
}

export interface ScrapeAction {
  type: "scrape";
  urls: string[];
  title: string;
  reasoning: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action = SearchAction | ScrapeAction | AnswerAction;

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: {
    type: "search" | "scrape" | "answer";
    title: string;
    reasoning: string;
    query?: string;
    urls?: string[];
  };
};

export const actionSchema = z.object({
  type: z.enum(["search", "scrape", "answer"]).describe(
    `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  query: z
    .string()
    .describe("The query to search for. Required if type is 'search'.")
    .optional(),
  urls: z
    .array(z.string())
    .describe("The URLs to scrape. Required if type is 'scrape'.")
    .optional(),
});

export const getNextAction = async (
  context: SystemContext,
): Promise<Action> => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a helpful AI assistant that follows a specific workflow to provide accurate, detailed answers.
      CURRENT DATE AND TIME: ${new Date().toISOString()}`,
    prompt: `
    Question: ${context.getInitialQuestion()}

    Based on the current context, choose the next action:
      - If you need more information, choose "search" with an appropriate query
      - If you have search results but need to scrape URLs for detailed content, choose "scrape" with the URLs to scrape
      - If you have enough information to answer the user's question, choose "answer"
    
    Here is the current context:

    ${context.getQueryHistory()}

    ${context.getScrapeHistory()}`,
  });

  const action = result.object;

  // Type the action properly based on the type field
  if (action.type === "search") {
    return {
      type: "search",
      query: action.query!,
      title: action.title,
      reasoning: action.reasoning,
    };
  } else if (action.type === "scrape") {
    return {
      type: "scrape",
      urls: action.urls!,
      title: action.title,
      reasoning: action.reasoning,
    };
  } else {
    return {
      type: "answer",
      title: action.title,
      reasoning: action.reasoning,
    };
  }
};
