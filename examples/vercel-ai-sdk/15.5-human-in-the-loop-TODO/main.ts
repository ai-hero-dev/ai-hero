import {
  streamText,
  tool,
  type CoreMessage,
} from "ai";
import { z } from "zod";
import { smallToolCallingModel } from "../../_shared/models.ts";
import { createInterface } from "node:readline/promises";
import {
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { inspect } from "node:util";

const model = smallToolCallingModel;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ROOT_DIRECTORY = import.meta.dirname;

await writeFile(
  path.join(ROOT_DIRECTORY, "example/delete-me.txt"),
  "Delete me!",
);

await writeFile(
  path.join(
    ROOT_DIRECTORY,
    "example/delete-me-and-me.txt",
  ),
  "Delete me!",
);

const toolImplementations = {
  deleteFile: async ({
    filePath,
  }: {
    filePath: string;
  }) => {
    if (path.isAbsolute(filePath)) {
      throw new Error(
        `File path must be relative, but was absolute: ${filePath}`,
      );
    }

    if (filePath.startsWith("..")) {
      throw new Error(
        `File path must not start with '..', but was: ${filePath}`,
      );
    }

    try {
      await rm(path.join(ROOT_DIRECTORY, filePath));
    } catch (e) {
      if (e instanceof Error) {
        return `Error deleting file: ${e.message}`;
      }

      throw e;
    }

    return `Deleted file: ${filePath}`;
  },
};

const TOOLS_THAT_REQUIRE_CONFIRMATION = Object.keys(
  toolImplementations,
);

const runAgent = async (
  messages: CoreMessage[],
  stepsRemaining = 10,
) => {
  const result = streamText({
    model,
    messages,
    system:
      `Read the contents of the directory before deleting a file. ` +
      `Some tool calls may be the subject of a safety confirmation.`,
    tools: {
      readDirectory: tool({
        description:
          "Read the contents of a directory",
        parameters: z.object({
          dir: z
            .string()
            .describe(
              "The relative path to the directory to read, in the format 'folder/subfolder'.",
            ),
        }),
        execute: async ({ dir }) => {
          try {
            const files = await readdir(
              path.resolve(ROOT_DIRECTORY, dir),
              {
                recursive: true,
              },
            );

            return {
              files: files.map((file) => {
                return path.join(dir, file);
              }),
            };
          } catch (e) {
            if (e instanceof Error) {
              return `Error reading directory: ${e.message}`;
            }

            throw e;
          }
        },
      }),
      deleteFile: tool({
        description: "Delete a file",
        parameters: z.object({
          filePath: z
            .string()
            .describe(
              "The relative path to the file to delete.",
            ),
        }),
      }),
    },
    maxSteps: stepsRemaining,
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  const finishReason = await result.finishReason;

  if (finishReason !== "tool-calls") {
    return;
  }

  const steps = await result.steps;

  const finalStep = steps[steps.length - 1]!;

  const finalMessages = finalStep.response.messages;

  messages.push(...finalMessages);

  const toolCallsNeedingConfirmation =
    finalStep.toolCalls.filter((call) =>
      TOOLS_THAT_REQUIRE_CONFIRMATION.includes(
        call.toolName,
      ),
    );

  for (const toolCall of toolCallsNeedingConfirmation) {
    const toolName = toolCall.toolName;

    console.log("");

    console.log(
      `LLM is requesting to run the tool "${toolName}" with args:`,
    );

    console.log(
      inspect(toolCall.args, {
        depth: null,
        colors: true,
      }),
    );

    const answer = await rl.question(
      `Do you want to proceed? (y/n) `,
    );

    if (answer === "yes" || answer === "y") {
      // Too complex for TS to grok, so need a cast
      const toolResult = await (
        toolImplementations as any
      )[toolName](toolCall.args);
      messages.push({
        role: "tool",
        content: [
          {
            result: toolResult,
            type: "tool-result",
            toolName,
            toolCallId: toolCall.toolCallId,
          },
        ],
      });
    } else {
      messages.push({
        role: "tool",
        content: [
          {
            result:
              "User declined to run the tool using a safety confirmation message. Do not attempt again.",
            type: "tool-result",
            toolName,
            toolCallId: toolCall.toolCallId,
          },
        ],
      });
    }
  }

  return runAgent(
    messages,
    stepsRemaining - steps.length,
  );
};

await runAgent([
  { role: "user", content: `Delete example/*.txt.` },
]);

rl.close();
