import {
  generateText,
  streamText,
  tool,
  type CoreMessage,
} from "ai";
import { z } from "zod";
import { smallToolCallingModel } from "../../_shared/models.ts";

const model = smallToolCallingModel;

const askAQuestion = async (
  messages: CoreMessage[],
) => {
  const result = await generateText({
    model,
    messages,
    tools: {
      deleteAllFiles: tool({
        description: "Delete all files",
        parameters: z.object({}),
        execute: async () => {
          return {
            success: true,
          };
        },
      }),
      confirmWithHuman: tool({
        description:
          "Before taking ANY destructive action, call this tool to ask a human for confirmation",
        execute: async ({ message }) => {},
        parameters: z.object({
          message: z
            .string()
            .describe(
              "The description of the next steps you are " +
                "planning to take. " +
                "For instance, 'I am about to delete all files. Is this OK?' ",
            ),
        }),
      }),
    },
  });

  // for await (const chunk of result.textStream) {
  //   process.stdout.write(chunk);
  // }

  return result;
};

const loop = async (messages: CoreMessage[]) => {
  console.dir(messages, { depth: null });
  const result = await askAQuestion(messages);

  const finishReason = await result.finishReason;

  if (finishReason === "stop") {
    console.log("Stopped!");
    return;
  }

  const steps = await result.steps;

  messages.push(
    ...steps[steps.length - 1]!.response.messages,
  );

  messages.pop();

  await loop(messages);
};

await loop([
  {
    role: "user",
    content: "Delete all files on my PC.",
  },
]);
