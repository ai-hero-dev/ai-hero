import { streamText, type StreamTextResult } from "ai";
import { model } from "./model";
import type { SystemContext } from "./system-context";

interface AnswerOptions {
  isFinal?: boolean;
}

export const answerQuestion = (
  context: SystemContext,
  options: AnswerOptions = {},
  onFinish: Parameters<typeof streamText>[0]["onFinish"],
  langfuseTraceId?: string,
): StreamTextResult<Record<string, never>, string> => {
  const { isFinal = false } = options;
  const userQuestion = context.getCurrentQuestion();

  const systemPrompt = `You are a helpful AI assistant that provides accurate, detailed answers based on the information available.

${isFinal ? "IMPORTANT: You may not have all the information needed to answer this question completely. Make your best effort to provide a helpful answer based on the available information, and clearly indicate any limitations or uncertainties." : ""}

IMPORTANT: When answering follow-up questions (like "that's not working" or "can you explain more"), make sure to:
1. Reference the previous conversation context
2. Address the specific issue or clarification being requested
3. Provide solutions or explanations that directly relate to what the user is asking about

Your task is to answer the user's question based on the search results and scraped content provided. Be thorough and accurate in your response.`;

  const prompt = `
Current Question: ${userQuestion}

Conversation History:
${context.getConversationHistory()}

${context.getQueryHistory()}

${context.getScrapeHistory()}

Please provide a comprehensive answer to the user's question based on the information above.`;

  return streamText({
    model,
    system: systemPrompt,
    prompt,
    onFinish,
    experimental_telemetry: langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "answer-question",
          metadata: {
            langfuseTraceId,
          },
        }
      : undefined,
  });
};
