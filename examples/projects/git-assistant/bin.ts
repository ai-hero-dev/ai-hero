import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool } from "ai";
import { z } from "zod";
import { promptTemplate } from "@promptbook/utils";

// const smallModel = anthropic(
//   "claude-3-5-haiku-latest",
// );

const largeModel = anthropic(
  "claude-3-5-sonnet-latest",
);

const handleInput = async (prompt: string) => {
  console.clear();
  const plan = await streamText({
    model: largeModel,
    prompt,
    system: promptTemplate`
      You are an agent tasked with helping a 
      software developer perform their daily tasks.
      You can help them with git actions.
      Be extremely concise.
      Reply only in lower-case, like a Gen-Z-er.
      Use extremely simple language
      Use short sentences, with one line per sentence.
      Before performing any action, ask for confirmation.
      Preview exactly the steps you will take to the user.
      After asking for confirmation, stop and wait for confirmation.
    `,
    tools: {
      performGitAction: tool({
        parameters: z.object({
          steps: z
            .string()
            .array()
            .describe(
              "A step-by-step guide to what you want the agent to do.",
            ),
        }),
        description: promptTemplate`
          Ask a separate agent to perform a git action.
          Provide a list of steps.
          The agent will execute them.
          New code changes should be pushed to the repo.
          Once the tool is called, the agent will execute the steps.
        `,
        execute: async ({ steps }) => {
          console.log();

          for (const step of steps) {
            console.log(`- ${step}`);
          }
          return "Git action succeeded";
        },
      }),
    },
    onStepFinish: async () => {
      console.log(`Step completed!`);
    },
    maxSteps: 3,
  });

  for await (const chunk of plan.textStream) {
    process.stdout.write(chunk);
  }
  console.log();
};

await handleInput("Undo my previous commit.");
