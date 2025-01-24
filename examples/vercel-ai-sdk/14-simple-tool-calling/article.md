So far we've been getting LLMs to answer questions, scan documents, and do data extraction.

But they can do a lot more than that. LLMs can interact with the world.

The way they do that is by calling tools or functions that we provide them.

And Vercel's AI SDK has a first-class solution for that.

We're going to start by creating the simplest tool imaginable and then we're going to go on from there.

<Scrollycoding>

# !!steps

Our tool is simply going to log to the console. To create it we're going to import `tool` from `ai`.

```ts ! example.ts
import { tool } from "ai";

const logToConsoleTool = tool({});
```

# !!steps

The first thing that any tool needs is a description of the parameters it's going to receive.

We can add this by specifying parameters on the tool.

This is done with a Zod schema just like we did with structured outputs before.

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const logToConsoleTool = tool({
  parameters: z.object({
    message: z.string(),
  }),
});
```

# !!steps

We're also using `describe` to describe the different parameters for the LLM.

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const logToConsoleTool = tool({
  parameters: z.object({
    message: z
      .string()
      .describe("The message to log to the console"),
  }),
});
```

# !!steps

Next we need to say what the tool is going to do.

We do that by specifying an `execute` function.

This `execute` function can be asynchronous, so it can do virtually anything - call APIs, write to a database, etc.

In our case we're just going to log to the console.

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const logToConsoleTool = tool({
  parameters: z.object({
    message: z
      .string()
      .describe("The message to log to the console"),
  }),
  execute: async ({ message }) => {
    console.log(message);
  },
});
```

# !!steps

Next we're going to add a `description` field to the tool itself.

This tells the LLM what it's supposed to do with the tool.

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const logToConsoleTool = tool({
  description: "Log a message to the console",
  parameters: z.object({
    message: z
      .string()
      .describe("The message to log to the console"),
  }),
  execute: async ({ message }) => {
    console.log(message);
  },
});
```

</Scrollycoding>

Now our tool's been created, let's actually use it inside a `generateText` call.

<Scrollycoding>

# !!steps

Let's create our function called `logToConsole`, passing in a model and a prompt.

```ts ! example.ts
import { generateText } from "ai";

const logToConsole = async (prompt: string) => {
  await generateText({
    model,
    prompt,
  });
};
```

# !!steps

We'll give it a system prompt to encourage it to use the tool.

```ts ! example.ts
import { generateText } from "ai";
import { promptTemplate } from "@promptbook/utils";

const logToConsole = async (prompt: string) => {
  await generateText({
    model,
    prompt,
    system: promptTemplate`
      Your only role in life is to log 
      messages to the console. 
      Use the tool provided to log the 
      prompt to the console.
    `,
  });
};
```

# !!steps

And finally let's pass it our tool.

```ts ! example.ts
import { generateText } from "ai";
import { promptTemplate } from "@promptbook/utils";

const logToConsole = async (prompt: string) => {
  await generateText({
    model,
    prompt,
    system: promptTemplate`
      Your only role in life is to log 
      messages to the console. 
      Use the tool provided to log the 
      prompt to the console.
    `,
    tools: {
      logToConsole: logToConsoleTool,
    },
  });
};
```

</Scrollycoding>

To recap, we've created a tool, passed it to `generateText` and given it a simple system prompt.

Let's see what happens when we run this.

```bash
Hello, world!
```

Success! We're seeing "hello world" printed out to the console.

## Debugging

That's pretty good, but it's quite opaque. How do we go in and debug this?

<Scrollycoding>

# !!steps

Let's destructure the `steps` property from the result of `generateText`.

`steps` is an array of each of the steps taken by the LLM.

We'll look at `steps` later because it starts to get into interesting stuff like agentic behavior and reasoning.

```ts ! example.ts
import { generateText } from "ai";
import { promptTemplate } from "@promptbook/utils";

const logToConsole = async (prompt: string) => {
  const { steps } = await generateText({
    model,
    prompt,
    system: promptTemplate`
      Your only role in life is to log 
      messages to the console. 
      Use the tool provided to log the 
      prompt to the console.
    `,
    tools: {
      logToConsole: logToConsoleTool,
    },
  });
};
```

# !!steps

For now we're just going to pull out a property from the first step taken which is tool calls.

This tells you all of the tools that were called during that step.

```ts ! example.ts
import { generateText } from "ai";
import { promptTemplate } from "@promptbook/utils";

const logToConsole = async (prompt: string) => {
  const { steps } = await generateText({
    model,
    prompt,
    system: promptTemplate`
      Your only role in life is to log 
      messages to the console. 
      Use the tool provided to log the 
      prompt to the console.
    `,
    tools: {
      logToConsole: logToConsoleTool,
    },
  });

  console.dir(steps[0]?.toolCalls, { depth: null });
};
```

</Scrollycoding>

When we run this we can see that the tool name `logToConsole` was called.

We can also see the arguments it was passed.

```bash
[
  {
    type: 'tool-call',
    toolCallId: 'toolu_012hbsiE2sXvPrAwAvE3kgxM',
    toolName: 'logToConsole',
    args: { message: 'Hello, world!' }
  }
]
```

If we log `toolResults` instead...

```ts
console.dir(steps[0]?.toolResults, { depth: null });
```

...we can see the result of the tool call. In this case we didn't return anything from our function so it's `undefined`.

```bash
[
  {
    toolCallId: 'toolu_012hbsiE2sXvPrAwAvE3kgxM',
    toolName: 'logToConsole',
    args: { message: 'Hello, world!' },
    result: undefined
  }
]
```

These `toolResults` can be fed back into the LLM to provide it more information, especially when run over multiple steps.

So debugging using `steps` is a way that you can get some insight as to what is happening with your tool calls.
