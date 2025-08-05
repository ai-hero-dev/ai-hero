import {
  streamText,
  type Message,
  type TelemetrySettings,
  type StreamTextResult,
} from "ai";

import { runAgentLoop } from "./run-agent-loop";
import type { OurMessageAnnotation } from "./get-next-action";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
  writeMessageAnnotation: (annotation: OurMessageAnnotation) => void;
}): Promise<StreamTextResult<{}, string>> => {
  // Get the last user message
  const lastUserMessage = opts.messages
    .filter((msg) => msg.role === "user")
    .pop();

  if (!lastUserMessage?.content) {
    throw new Error("No user message found");
  }

  // Run the agent loop with the user's question
  return await runAgentLoop(lastUserMessage.content, {
    writeMessageAnnotation: opts.writeMessageAnnotation,
  });
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
    writeMessageAnnotation: () => {}, // no-op for evals
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
