import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./model";
import type { SystemContext } from "./system-context";

export interface ContinueAction {
  type: "continue";
  title: string;
  reasoning: string;
  feedback: string;
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
    feedback?: string;
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
  feedback: z
    .string()
    .optional()
    .describe(
      "Detailed feedback about what information is missing (only required for 'continue' actions). " +
        "Specify exactly what information gaps exist and what should be searched for next.",
    ),
});

export const getNextAction = async (
  context: SystemContext,
  langfuseTraceId?: string,
): Promise<Action> => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a research query optimizer. Your task is to analyze search results against the original research goal and either decide to answer the question or to search for more information.

PROCESS:
1. Identify ALL information explicitly requested in the original research goal
2. Analyze what specific information has been successfully retrieved in the search results
3. Identify ALL information gaps between what was requested and what was found
4. For entity-specific gaps: Create targeted feedback for each missing attribute of identified entities
5. For general knowledge gaps: Create focused feedback to identify the missing conceptual information

EVALUATION CRITERIA:
- Consider the comprehensiveness of the information gathered
- Assess whether the search results directly address the core question
- Identify any contradictions or inconsistencies that need resolution
- Determine if additional context or clarification is needed

FEEDBACK REQUIREMENTS:
- Only provide feedback for 'continue' actions
- Be specific about what information is missing or incomplete
- Explain why certain information gaps are critical to answering the question
- Clearly articulate what should be searched for next

CURRENT DATE AND TIME: ${new Date().toISOString()}`,
    prompt: `
    Current Question: ${context.getCurrentQuestion()}

    Conversation History:
    ${context.getConversationHistory()}

    Search Results Analysis:
    ${context.getSearchHistory()}

    Based on your analysis of the search results against the research goal:
    1. Evaluate whether the gathered information is sufficient to provide a comprehensive answer
    2. If insufficient, specify exactly what information gaps exist and need to be addressed
    3. Provide detailed feedback about your evaluation to guide the next iteration`,
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

  const action = result.object;

  // Type assertion to ensure proper typing based on action type
  if (action.type === "continue") {
    return {
      type: "continue",
      title: action.title,
      reasoning: action.reasoning,
      feedback: action.feedback || "",
    } as ContinueAction;
  } else {
    return {
      type: "answer",
      title: action.title,
      reasoning: action.reasoning,
    } as AnswerAction;
  }
};
