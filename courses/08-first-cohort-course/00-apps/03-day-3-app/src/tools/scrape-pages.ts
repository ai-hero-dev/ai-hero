import { cacheWithRedis } from "~/server/redis/redis";
import { crawlMultipleUrls } from "~/firecrawl";

export const scrapePages = cacheWithRedis("scrape-pages", async (urls) => {
  const result = await crawlMultipleUrls(urls);

  return result;
});
