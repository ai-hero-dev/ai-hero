import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    REDIS_URL: z.string().url(),
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    SERPER_API_KEY: z.string(),
    EVAL_DATASET: z.enum(["dev", "ci", "regression"]).default("dev").optional(),
    SEARCH_RESULTS_COUNT: z.coerce.number().default(10),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(10),
    RATE_LIMIT_MAX_RETRIES: z.coerce.number().default(3),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
    RATE_LIMIT_KEY_PREFIX: z.string().default("global_llm"),
    CACHE_EXPIRY_SECONDS: z.coerce.number().default(21600),
    SCRAPER_MAX_RETRIES: z.coerce.number().default(3),
    DB_DAILY_LIMIT: z.coerce.number().default(1000),
    SCRAPE_PAGES_COUNT: z.coerce.number().default(3),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {},

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    REDIS_URL: process.env.REDIS_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    SERPER_API_KEY: process.env.SERPER_API_KEY,
    EVAL_DATASET: process.env.EVAL_DATASET,
    SEARCH_RESULTS_COUNT: process.env.SEARCH_RESULTS_COUNT,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_MAX_RETRIES: process.env.RATE_LIMIT_MAX_RETRIES,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_KEY_PREFIX: process.env.RATE_LIMIT_KEY_PREFIX,
    CACHE_EXPIRY_SECONDS: process.env.CACHE_EXPIRY_SECONDS,
    SCRAPER_MAX_RETRIES: process.env.SCRAPER_MAX_RETRIES,
    DB_DAILY_LIMIT: process.env.DB_DAILY_LIMIT,
    SCRAPE_PAGES_COUNT: process.env.SCRAPE_PAGES_COUNT,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
