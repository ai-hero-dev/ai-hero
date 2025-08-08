import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./model";
import type { SystemContext } from "./system-context";

export interface ContinueAction {
  type: "continue";
  title: string;
  reasoning: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action = ContinueAction | AnswerAction;

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: {
    type: "continue" | "answer";
    title: string;
    reasoning: string;
  };
};

const actionSchema = z.object({
  type: z.enum(["continue", "answer"]).describe(
    `The type of action to take.
      - 'continue': Continue searching for more information to better answer the question.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. Examples: 'Continuing research', 'Gathering more information', 'Providing answer'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
});

export const getNextAction = async (
  context: SystemContext,
  langfuseTraceId?: string,
): Promise<Action> => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a helpful AI assistant that follows a specific workflow to provide accurate, detailed answers.
  
    IMPORTANT: When handling follow-up questions (like "that's not working" or "can you explain more"), you should:
    1. Understand the context from the previous conversation
    2. Interpret what the user is referring to based on the conversation history
    3. Continue searching for information that addresses the specific issue or clarification being requested
  
    CURRENT DATE AND TIME: ${new Date().toISOString()}`,
    prompt: `
    Current Question: ${context.getCurrentQuestion()}

    Conversation History:
    ${context.getConversationHistory()}

    Based on the current context and conversation history, choose the next action:
      - If you need more information to provide a comprehensive answer, choose "continue"
      - If you have enough information to answer the user's question, choose "answer"
    
    Here is the current context:

    ${context.getSearchHistory()}`,
    experimental_telemetry: langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "get-next-action",
          metadata: {
            langfuseTraceId,
          },
        }
      : undefined,
  });

  return result.object;
};
