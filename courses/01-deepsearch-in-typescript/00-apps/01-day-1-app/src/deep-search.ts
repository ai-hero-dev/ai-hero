import { streamText, type Message, type TelemetrySettings } from "ai";
import { model } from "./model";
import { searchWeb, scrapePages } from "./app/api/chat/search-web-tool";
import { SYSTEM_PROMPT } from "./system-prompt";

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    system: SYSTEM_PROMPT.replace("{date}", new Date().toISOString()),
    tools: { searchWeb, scrapePages },
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });

export async function askDeepSearch(messages: Message[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {},
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this, the stream will never finish
  await result.consumeStream();

  return await result.text;
}
