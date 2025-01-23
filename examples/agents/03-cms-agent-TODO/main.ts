import { streamText, tool } from "ai";
import { z } from "zod";
import { cliChat } from "../../_shared/cli-chat.ts";
import { smallToolCallingModel } from "../../_shared/models.ts";
import { createCmsClient } from "./client.ts";
import { seedDatabase } from "./seed.ts";
import { startServer } from "./server.ts";
import { prompt } from "@promptbook/utils";


// Setup code
const server = await startServer();
await seedDatabase();
const client = createCmsClient();

await cliChat({
  answerQuestion: async (question, messages) => {
    const result = await streamText({
      model: smallToolCallingModel,
      system: prompt`
        You are a content management agent
        You help to update a CMS based on user input.
      `,
      messages: [
        ...messages,
        {
          role: "user",
          content: question,
        },
      ],
      tools: {
        viewPosts: tool({
          parameters: z.object({}),
          description: "View all posts",
          execute: async () => {
            return await client.getAllPosts();
          },
        }),
        viewPost: tool({
          parameters: z.object({ id: z.string() }),
          description:
            "View a specific post, including its content",
          execute: async ({ id }) => {
            return await client.getPost(id);
          },
        }),
        updatePost: tool({
          parameters: z.object({
            id: z.string(),
            title: z.string(),
            content: z.string(),
          }),
          description:
            "Update a specific post with a new title and content",
          execute: async ({ id, title, content }) => {
            return await client.updatePost(id, {
              title,
              content,
            });
          },
        }),
        createPost: tool({
          parameters: z.object({
            title: z.string(),
            content: z.string(),
          }),
          description: "Create a new post",
          execute: async ({ title, content }) => {
            return await client.createPost({
              title,
              content,
            });
          },
        }),
        deletePost: tool({
          parameters: z.object({ id: z.string() }),
          description: "Delete a specific post",
          execute: async ({ id }) => {
            return await client.deletePost(id);
          },
        }),
      },
      maxSteps: 5,
    });

    return result;
  },
});

// Teardown code
server.close();
