import { smallToolCallingModel } from "../../_shared/models.ts";
import { tool } from "ai";
import { promptTemplate } from "@promptbook/utils";
import { z } from "zod";
import { generateText } from "ai";

const model = smallToolCallingModel;

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

await logToConsole("Hello world!");
