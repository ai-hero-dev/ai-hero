import { generateText, streamText, tool } from "ai";
import { z } from "zod";
import { smallToolCallingModel } from "../../_shared/models.ts";

const deleteFileTool = tool({
  description: "Delete a file",
  parameters: z.object({
    filePath: z
      .string()
      .describe(
        "The relative path to the file to delete.",
      ),
  }),
  // execute: async ({ filePath }) => {
  //   return `Deleted file at ${filePath}`;
  // },
});

const runAgent = async (prompt: string) => {
  const result = streamText({
    model: smallToolCallingModel,
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

await runAgent("delete example.txt");
