import FirecrawlApp from "@mendable/firecrawl-js";
import { env } from "./env";

const firecrawl = new FirecrawlApp({
  apiKey: env.FIRECRAWL_API_KEY,
});

type CrawlError = {
  error: string;
};

type CrawlResult = {
  markdown: string | undefined;
  url: string | undefined;
  title: string | undefined;
};

export const crawlMultipleUrls = async (
  urls: string[],
): Promise<CrawlResult[] | CrawlError> => {
  const response = await firecrawl.batchScrapeUrls(urls, {
    formats: ["markdown"],
  });

  if (response.success) {
    return response.data.map((result) => {
      return {
        markdown: result.markdown,
        url: result.url,
        title: result.title,
      };
    });
  } else {
    return {
      error: response.error,
    };
  }
};
