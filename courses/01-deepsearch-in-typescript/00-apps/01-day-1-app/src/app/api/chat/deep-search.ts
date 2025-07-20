import { streamText, type Message, type TelemetrySettings } from "ai";
import { model } from "~/app/api/chat/model";
import { searchWeb, scrapePages } from "./tools";
import { systemPrompt } from "./system-prompt";
import { checkRateLimit, recordRateLimit } from "~/server/redis/rate-limit";
import { env } from "~/env";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) => {
  // Global rate limiting configuration
  const config = {
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    maxRetries: env.RATE_LIMIT_MAX_RETRIES,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    keyPrefix: env.RATE_LIMIT_KEY_PREFIX,
  };

  // Check the rate limit
  const rateLimitCheck = await checkRateLimit(config);

  if (!rateLimitCheck.allowed) {
    console.log("Global rate limit exceeded, waiting...");
    const isAllowed = await rateLimitCheck.retry();
    // If the rate limit is still exceeded, throw an error
    if (!isAllowed) {
      throw new Error("Global rate limit exceeded");
    }
  }

  // Record the request
  await recordRateLimit(config);

  return streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    system: systemPrompt.replace("{date}", new Date().toISOString()),
    tools: { searchWeb, scrapePages },
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
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
