import { generateText } from "ai";
import { model } from "./model";
import type { SystemContext } from "./system-context";

interface AnswerOptions {
  isFinal?: boolean;
}

export const answerQuestion = async (
  context: SystemContext,
  options: AnswerOptions = {},
): Promise<string> => {
  const { isFinal = false } = options;
  const userQuestion = context.getInitialQuestion();

  const systemPrompt = `You are a helpful AI assistant that provides accurate, detailed answers based on the information available.

${isFinal ? "IMPORTANT: You may not have all the information needed to answer this question completely. Make your best effort to provide a helpful answer based on the available information, and clearly indicate any limitations or uncertainties." : ""}

Your task is to answer the user's question based on the search results and scraped content provided. Be thorough and accurate in your response.`;

  const prompt = `
User Question: ${userQuestion}

${context.getQueryHistory()}

${context.getScrapeHistory()}

Please provide a comprehensive answer to the user's question based on the information above.`;

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt,
  });

  return result.text;
};
