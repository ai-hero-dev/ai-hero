import { streamText, tool, type CoreTool } from "ai";
import * as fs from "fs/promises";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { join } from "path";
import { smallToolCallingModel } from "../../../_shared/models.ts";
import { createCmsClient } from "./cms-client.ts";
import { z } from "zod";
import type { GetToolExecutionMapFromTools } from "../../../_shared/utils.ts";

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export const honoApp = new Hono();

honoApp.use(cors());

const DB_PATH = join(
  import.meta.dirname,
  "db.local.json",
);

// Database helper functions
const readDb = async (): Promise<
  Record<string, Post>
> => {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    await fs.writeFile(DB_PATH, JSON.stringify({}));
    return {};
  }
};

const writeDb = async (data: Record<string, Post>) => {
  await fs.writeFile(
    DB_PATH,
    JSON.stringify(data, null, 2),
  );
};

// Create a post
honoApp.post("/api/cms/posts", async (c) => {
  const db = await readDb();
  const body =
    await c.req.json<Omit<Post, "id" | "createdAt">>();
  const id = crypto.randomUUID();
  const post: Post = {
    id,
    title: body.title,
    content: body.content,
    createdAt: new Date().toISOString(),
  };

  db[id] = post;
  await writeDb(db);

  return c.json(post, 201);
});

// Get all posts
honoApp.get("/api/cms/posts", async (c) => {
  const db = await readDb();
  const posts = Object.values(db);
  return c.json(posts);
});

// Get single post
honoApp.get("/api/cms/posts/:id", async (c) => {
  const db = await readDb();
  const post = db[c.req.param("id")];
  if (!post)
    return c.json({ error: "Post not found" }, 404);
  return c.json(post);
});

// Update a post
honoApp.put("/api/cms/posts/:id", async (c) => {
  const db = await readDb();
  const id = c.req.param("id");
  if (!db[id])
    return c.json({ error: "Post not found" }, 404);

  const body =
    await c.req.json<
      Partial<
        Omit<Post, "id" | "createdAt" | "updatedAt">
      >
    >();
  db[id] = {
    ...db[id],
    ...body,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);

  return c.json(db[id]);
});

// Delete a post
honoApp.delete("/api/cms/posts/:id", async (c) => {
  const db = await readDb();
  const id = c.req.param("id");
  if (!db[id])
    return c.json({ error: "Post not found" }, 404);

  delete db[id];
  await writeDb(db);

  return c.json({ success: true });
});

const client = createCmsClient();

const tools = {
  viewAllPosts: tool({
    parameters: z.object({}),
    description: "View all posts",
    execute: async () => {
      const result = await client.getAllPosts();
      return result.map(
        ({ content, ...rest }) => rest,
      );
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
  }),
  createPost: tool({
    parameters: z.object({
      title: z
        .string()
        .describe("The title of the post"),
      content: z
        .string()
        .describe(
          "The post's content, in markdown format",
        ),
    }),
    description: "Create a new post",
  }),
  deletePost: tool({
    parameters: z.object({ id: z.string() }),
    description: "Delete a specific post",
  }),
};

honoApp.post("/api/chat", async (ctx) => {
  const { messages } = await ctx.req.json();

  const result = await streamText({
    model: smallToolCallingModel,
    system:
      `You are a content management agent. ` +
      `You help to update a CMS based on user input. ` +
      `Think step-by-step. ` +
      `Before updating content, offer the user the chance to make changes. `,
    messages,
    tools,
    maxSteps: 10,
  });

  return result.toDataStreamResponse();
});

const dangerousToolExecutors: GetToolExecutionMapFromTools<
  typeof tools
> = {
  updatePost: async ({ id, title, content }) => {
    return await client.updatePost(id, {
      title,
      content,
    });
  },
  createPost: async ({ title, content }) => {
    return await client.createPost({
      title,
      content,
    });
  },
  deletePost: async ({ id }) => {
    return await client.deletePost(id);
  },
};

honoApp.post("/api/call-tool", async (ctx) => {
  const { toolName, args } = await ctx.req.json();

  const result = await (dangerousToolExecutors as any)[
    toolName
  ]?.(args);

  return ctx.json(result);
});
