import { experimental_wrapLanguageModel, type LanguageModelV1 } from "ai";
import { createCacheMiddleware } from "./cache-model.ts";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

/**
 * The cache object that uses the file system as a storage.
 */
const cache = createStorage({
  // unstorage's types are a bit dodgy, so an
  // as any is needed
  driver: (fsDriver as any)({
    base: "./node_modules/.cache",
  }),
});

/**
 * Takes in a model from AI SDK and wraps it with some
 * middleware which caches the results in the file system.
 */
export const cacheModelInFs = (model: LanguageModelV1) => {
  return experimental_wrapLanguageModel({
    model,
    middleware: createCacheMiddleware(cache),
  });
};
