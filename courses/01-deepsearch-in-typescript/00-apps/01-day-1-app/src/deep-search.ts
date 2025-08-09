import { streamText } from "ai";
import type { Message, StreamTextResult } from "ai";

import { runAgentLoop } from "./run-agent-loop";
import type { OurMessageAnnotation } from "./get-next-action";
import { checkIsSafe } from "./check-is-safe";
import { SystemContext } from "./system-context";
import { model } from "./model";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  langfuseTraceId?: string;
  writeMessageAnnotation: (annotation: OurMessageAnnotation) => void;
}): Promise<StreamTextResult<Record<string, never>, string>> => {
  // Check if the request is safe before processing
  const ctx = new SystemContext(opts.messages);
  const safetyCheck = await checkIsSafe(ctx);

  if (safetyCheck.classification === "refuse") {
    // Return a refused message instead of processing the request
    return streamText({
      model,
      messages: [
        {
          role: "user",
          content: "Request refused for safety reasons",
        },
      ],
      system: `You are a helpful AI assistant. The user's request has been flagged for safety reasons and cannot be processed. 

Reason: ${safetyCheck.reason || "Request violates safety guidelines"}

Please politely explain that you cannot help with this type of request and suggest they ask about something else instead. Be brief and friendly, but firm about not being able to process the original request.`,
      onFinish: opts.onFinish,
    });
  }

  // Pass the full message history to provide context for follow-up questions
  return await runAgentLoop(opts.messages, {
    writeMessageAnnotation: opts.writeMessageAnnotation,
    langfuseTraceId: opts.langfuseTraceId,
    onFinish: opts.onFinish,
  });
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {
      // just a stub
    },
    langfuseTraceId: undefined,
    writeMessageAnnotation: () => {
      // no-op for evals
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
