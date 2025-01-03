// Set the telemetry endpoint and headers
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317/api/trace";
process.env.OTEL_EXPORTER_OTLP_HEADERS = "Authorization=Bearer <Your API Key>";

import { serve } from "@hono/node-server";
import { generateText } from "ai";
import { Hono } from "hono";
import { once } from "node:events";
import { openai } from "@ai-sdk/openai";

const model = openai("gpt-4o-mini");

export const ask = async (input: string) => {
  const { text } = await generateText({
    model,
    prompt: input,
    experimental_telemetry: {
      isEnabled: true,
    },
  });

  return text;
};

// Create a server
const app = new Hono();

app.all("/api/trace", async (c) => {
  console.log("Hello!");
  const body = await c.req.json();

  // This logs the body of the request
  console.dir(body, { depth: null });
  c.status(200);

  return c.text("");
});

const server = serve({
  fetch: app.fetch,
  port: 4317,
  hostname: "0.0.0.0",
});

// Wait for the server to start
await once(server, "listening");

// Ask a question
const result = await ask("What is the capital of France?");

console.log(result);

server.close();

// The server should log the incoming OTLP trace data,
// but it currently does nothing.
