/**
 * A modified version of {@link https://sdk.vercel.ai/docs/advanced/caching#caching-responses}
 */

import type {
  Experimental_LanguageModelV1Middleware as LanguageModelV1Middleware,
  LanguageModelV1StreamPart,
} from "ai";
import { simulateReadableStream } from "ai/test";
import type { StorageCache } from "./types.ts";
import { createKey, fixTimestampsOnCachedObject } from "./utils.ts";

/**
 * Creates a middleware that caches the responses of the
 * model to a generic cache.
 *
 * Compatible with {@link https://github.com/unjs/unstorage Unstorage}.
 */
export const createCacheMiddleware = (
  cache: StorageCache
): LanguageModelV1Middleware => ({
  wrapGenerate: async ({ doGenerate, params, model }) => {
    const cacheKey = createKey({ params, model });

    const cached = await cache.get(cacheKey);

    if (cached !== null) {
      return fixTimestampsOnCachedObject(cached);
    }

    const result = await doGenerate();

    await cache.set(cacheKey, result);

    return result;
  },
  wrapStream: async ({ doStream, params, model }) => {
    const cacheKey = createKey({ params, model });

    // Check if the result is in the cache
    const cached = await cache.get(cacheKey);

    // If cached, return a simulated ReadableStream that yields the cached result
    if (cached !== null) {
      // Format the timestamps in the cached response
      try {
        const formattedChunks = (cached as LanguageModelV1StreamPart[]).map(
          (p) => {
            if (p.type === "response-metadata" && p.timestamp) {
              return { ...p, timestamp: new Date(p.timestamp) };
            } else return p;
          }
        );
        return {
          stream: simulateReadableStream({
            initialDelayInMs: 0,
            chunkDelayInMs: 10,
            chunks: formattedChunks,
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        };
      } catch (e) {
        // For now, only log to console - but your error
        // tracker should know about this!
        console.log(e);
      }
    }

    // If not cached, proceed with streaming
    const { stream, ...rest } = await doStream();

    const fullResponse: LanguageModelV1StreamPart[] = [];

    const transformStream = new TransformStream<
      LanguageModelV1StreamPart,
      LanguageModelV1StreamPart
    >({
      transform(chunk, controller) {
        fullResponse.push(chunk);
        controller.enqueue(chunk);
      },
      async flush() {
        await cache.set(cacheKey, fullResponse);
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
});
