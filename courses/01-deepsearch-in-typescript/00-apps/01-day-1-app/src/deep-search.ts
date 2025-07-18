import { streamText, type Message, type TelemetrySettings } from "ai";
import { model } from "./model";
import { searchWeb, scrapePages } from "./app/api/chat/search-web-tool";

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to a web search tool and a web page scraping tool.\n\nToday is ${new Date().toISOString()}.\nWhen the user asks for up-to-date information, use this date to inform your answer and cite when the information was last updated.\n\nPlease follow these guidelines:\n\n- Always use the \`searchWeb\` tool to answer user questions.\n- After calling the searchWeb tool, you must always use the \`scrapePages\` tool to fetch the full content of web pages before showing any results to the user. Do not show any results or summaries until you have scraped the relevant pages.\n- When using the \`scrapePages\` tool, always scrape a LOT of websites (at least 4 to 6 per query) and use a diverse set of sources. Do not just scrape one or two sites, and do not use only a single domain. Try to include a mix of news, blogs, official sources, and community sites if possible.\n- Be thorough in your answers, but concise.\n- Always cite your sources.\n- Always respond in markdown and format the response in a clear, visually appealing way.\n\nA typical workflow would be:\n1. User asks a question.\n2. Use the \`searchWeb\` tool to find relevant web pages.\n3. Use the \`scrapePages\` tool to fetch full content of those pages (at least 4 to 6, from diverse sources).\n4. Analyze the content and provide a comprehensive answer.\n- If the user asks for a specific piece of information, try to find it in the scraped content.  \n\nIf you cannot answer, explain why.\n`;

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    system: SYSTEM_PROMPT,
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
