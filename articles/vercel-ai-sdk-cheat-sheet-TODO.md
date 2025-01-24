## Models

### OpenAI

```ts
// pnpm add @ai-sdk/openai

import { openai } from "@ai-sdk/openai";

const model = openai("gpt-4o");
```

### Anthropic

```ts
// pnpm add @ai-sdk/anthropic

import { anthropic } from "@ai-sdk/anthropic";

const model = anthropic("claude-3-5-sonnet-latest");
```

### Google

```ts
// pnpm add @ai-sdk/google

import { google } from "@ai-sdk/google";

const model = google("gemini-1.5-pro-latest");
```

### Local Models

Connect to any OpenAI-compatible model using `createOpenAICompatible`.

```ts
// pnpm add @ai-sdk/openai-compatible

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const lmstudio = createOpenAICompatible({
  name: "lmstudio",
  baseUrl: "http://localhost:1234",
});

const localModel = lmstudio("local-model-name");

await generateText({
  model: localModel,
  prompt: "Hello!",
});
```

## Generating Text

```ts
import { generateText } from "ai";

const { text } = await generateText({
  prompt: "What is your name?",
  model,
});

console.log(text);
```

## Streaming Text

Returns an `AsyncIterable` of text chunks as soon as they are generated.

```ts
import { streamText } from "ai";

const { textStream } = await streamText({
  prompt: "What is your name?",
  model,
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

## System Prompt

Tell the AI how to behave.

```ts
import { generateText } from "ai";

await generateText({
  prompt: inputText,
  model,
  system: `Generate a summary of the text.`,
});
```

## Pass Message History

Pass `messages` instead of `prompt`.

```ts
import { generateText } from "ai";

await generateText({
  model,
  messages: [
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hi there!" },
  ],
});
```

## Get Structured Output

```ts
import { generateObject } from "ai";
import { z } from "zod";

await generateObject({
  model,
  schemaName: "Account information",
  schema: z.object({
    accountNumber: z
      .string()
      .describe("The account number."),
    balance: z
      .number()
      .describe("The account balance."),
  }),
  system: `Get account information from the text.`,
  prompt: `
    Account Number: 123456
    Balance: $100.00
  `,
});
```

## Generate An Enum

Use `generateObject` and specify `output: "enum"`.

```ts
import { generateObject } from "ai";

const { object } = await generateObject({
  model,
  prompt: inputText,
  output: "enum",
  enum: ["positive", "negative", "neutral"],
  system: `Classify the sentiment of the text.`,
});

console.log(object);
// "positive" | "negative" | "neutral"
```

## Passing Files TODO

## Tracking Token Usage

`usage` returns the tokens used in the prompt and completion.

```ts
import { generateText } from "ai";

const { usage } = await generateText({
  model,
  prompt,
});

console.log(usage.promptTokens); // 10
console.log(usage.completionTokens); // 20
```
