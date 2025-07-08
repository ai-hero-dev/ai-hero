There's something about agents that I find pretty scary.

For AI agents to do anything useful, they need access to powerful tools.

If you're building a coding agent, these powerful tools could involve deleting files, updating files, and installing NPM packages.

But handing over control of these tools to the agent feels kind of risky.

One way to mitigate that is by adding a human in the loop.

This adds a confirmation step before any dangerous tools can be executed.

This way, an LLM can make its plans, but you have to review them before they're carried out.

This is a good way to keep an agent in check but also make sure that its plans correspond to what you want it to do.

I've personally found that the closer I keep the human in the loop, the better outputs I get from the agent.

## The Tool Call Lifecycle

To build this we're going to have to understand the life cycle of tool calls a bit better.

Tool calls and tool results are really just fancy messages.

They're tracked in the history in the same way as user messages, system messages and assistant messages.

Our message history is going to start off with a user message of could you delete this file.

The assistant will then reply with of course I'll go right ahead and do that.

It will then append the tool call to the messages.

Let's see that working with some code.

Let's first create our tool, `deleteFile`.

We're passing it a description and some parameters, and stubbing out the execute function.

```ts
import { tool } from "ai";
import { z } from "zod";

const deleteFileTool = tool({
  description: "Delete a file",
  parameters: z.object({
    filePath: z
      .string()
      .describe(
        "The relative path to the file to delete.",
      ),
  }),
  execute: async ({ filePath }) => {
    return `Deleted file at ${filePath}`;
  },
});
```

<Scrollycoding>

# !!steps

Next let's create a run agent function.

Inside will call stream text, passing our tool.

```ts ! example.ts
import { streamText } from "ai";

const runAgent = async (prompt: string) => {
  const result = streamText({
    model,
    prompt,
    tools: {
      deleteFile: deleteFileTool,
    },
  });
};
```

# !!steps

Next we're going to handle the text stream by logging into standard out:

```ts ! example.ts
import { streamText } from "ai";

const runAgent = async (prompt: string) => {
  const result = streamText({
    model,
    prompt,
    tools: {
      deleteFile: deleteFileTool,
    },
  });

  for await (const text of result.textStream) {
    process.stdout.write(text);
  }
};
```

# !!steps

Next we're going to await the steps.

We're going to grab the final step.

```ts ! example.ts
import { streamText } from "ai";

const runAgent = async (prompt: string) => {
  const result = streamText({
    model,
    prompt,
    tools: {
      deleteFile: deleteFileTool,
    },
  });

  for await (const text of result.textStream) {
    process.stdout.write(text);
  }

  const steps = await result.steps;

  const finalStep = steps[steps.length - 1]!;
};
```

# !!steps

Grabbing all of the new messages that were added during this step is a little awkward.

We can grab step.response dot messages, and log them to the console.

```ts ! example.ts
import { streamText } from "ai";

const runAgent = async (prompt: string) => {
  const result = streamText({
    model,
    prompt,
    tools: {
      deleteFile: deleteFileTool,
    },
  });

  for await (const text of result.textStream) {
    process.stdout.write(text);
  }

  const steps = await result.steps;

  const finalStep = steps[steps.length - 1]!;

  const finalMessages = finalStep.response.messages;

  console.dir(finalMessages, { depth: null });
};
```

</Scrollycoding>

Let's run this with a prompt of "delete `example.txt`".

```ts
await runAgent("delete example.txt");
```

We end up with this being logged:

```json
[
  {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "I'll help you delete the file \"example.txt\". I'll use the `deleteFile` function to remove the file."
      },
      {
        "type": "tool-call",
        "toolCallId": "toolu_01BJf8Z8T7X7yM26xSyomeCH",
        "toolName": "deleteFile",
        "args": { "filePath": "example.txt" }
      }
    ]
  },
  {
    "role": "tool",
    "content": [
      {
        "type": "tool-result",
        "toolCallId": "toolu_01BJf8Z8T7X7yM26xSyomeCH",
        "toolName": "deleteFile",
        "result": "Deleted file at example.txt"
      }
    ]
  }
]
```

There are two new messages here. There is the assistant, in other words the agent, saying "I'll help you delete the file" and then calling the tool.

The AI SDK then calls the tool for you and appends that to the messages.

## `execute` In Tool Calls

To make our human in the loop work we need to prevent the AIS decay from executing the tool right away. We want to ask for confirmation first.

What would happen if we didn't provide an `execute` function to our tool?

```ts
import { tool } from "ai";
import { z } from "zod";

const deleteFileTool = tool({
  description: "Delete a file",
  parameters: z.object({
    filePath: z
      .string()
      .describe(
        "The relative path to the file to delete.",
      ),
  }),
  // Comment it out!
  // execute: async ({ filePath }) => {
  //   return `Deleted file at ${filePath}`;
  // },
});
```

Now when we run this again we notice something different in the output:

```json
[
  {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "I'll help you delete the file \"example.txt\". I'll use the `deleteFile` function to remove the file."
      },
      {
        "type": "tool-call",
        "toolCallId": "toolu_01L6Lxw8od7XQz4toWXcdaEA",
        "toolName": "deleteFile",
        "args": { "filePath": "example.txt" }
      }
    ]
  }
]
```

The tool result is missing. In other words the ASDK is waiting for us to execute the tool.

This is our chance. While the conversation has been paused, we can ask the user for confirmation, and execute the tool if they say yes.

## Taking Control Of The Loop

However, there's one more step we need to take.

We need to take control of the loop ourselves.

---

Usually the AI SDK goes right ahead to execute the tool and then returns the tool result.

All of this is in a single step.

Finally in the second step the assistant reads the result of the tool and then says "ok I've deleted the file for you anything else?".

But in our case we want to separate the tool execution from the tool call.
