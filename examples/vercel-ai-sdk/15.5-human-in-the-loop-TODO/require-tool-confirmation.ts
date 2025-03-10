import {
  streamText,
  tool,
  type CoreMessage,
  type CoreTool,
  type StreamTextResult,
} from "ai";
import { z } from "zod";
import { smallToolCallingModel } from "../../_shared/models.ts";
import { readdir } from "node:fs/promises";
import path from "node:path";

const deleteFileTool = tool({
  description: "Delete a file",
  parameters: z.object({
    filePath: z
      .string()
      .describe(
        "The relative path to the file to delete.",
      ),
  }),
});

const ROOT_DIRECTORY = import.meta.dirname;

declare const createConfirmer: <
  T extends Record<string, z.ZodType>,
>(opts: {
  tools: {
    [K in keyof T]: {
      tool: CoreTool<T[K]>;
      execute: (
        parameters: z.infer<T[K]>,
      ) => Promise<unknown>;
    };
  };
  maxSteps: number;
}) => {
  run: <U extends StreamTextResult<any>>(
    messages: CoreMessage[],
    runner: (
      messages: CoreMessage[],
      stepsRemaining: number,
    ) => PromiseLike<U>,
  ) => Promise<{
    result: U;
    requiresConfirmation: boolean;

    stepsRemaining: number;
  }>;
};

type PromiseLike<T> = T | Promise<T>;

const confirmer = createConfirmer({
  tools: {
    deleteFile: {
      tool: deleteFileTool,
      execute: async ({ filePath }) => {
        // TODO
      },
    },
  },
  maxSteps: 10,
});

const result = await confirmer.run(
  [{ role: "user", content: "Delete example.txt" }],
  (messages, stepsRemaining) => {
    const streamResult = streamText({
      model: smallToolCallingModel,
      messages,
      maxSteps: stepsRemaining,
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
        deleteFile: deleteFileTool,
      },
    });

    return streamResult;
  },
);
