import type { Message, TelemetrySettings, StreamTextResult } from "ai";
import { checkRateLimit, recordRateLimit } from "~/server/redis/rate-limit";
import { env } from "~/env";
import { runAgentLoop } from "~/lib/run-agent-loop";
import type { MessageAnnotation } from "~/lib/get-next-action";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: (result: { text: string }) => void;
  langfuseTraceId?: string;
  writeMessageAnnotation?: (annotation: MessageAnnotation) => void;
}): Promise<StreamTextResult<{}, string>> => {
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

  // Extract the langfuseTraceId from telemetry metadata
  const langfuseTraceId = opts.langfuseTraceId;

  // Run the agent loop and return the result
  return runAgentLoop(opts.messages, opts.writeMessageAnnotation, {
    langfuseTraceId,
  });
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {},
  });

  // Consume the stream - without this, the stream will never finish
  await result.consumeStream();

  return await result.text;
}
