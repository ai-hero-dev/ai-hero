You may have noticed this, but I am running a content business.

That involves working with a Content Management System, a CMS - creating posts, deleting posts, updating posts.

So I spend a significant amount of my life clicking through UIs on my CMS, which is pretty boring and time-consuming.

Don't get me wrong. I like writing the posts. It's really fun, really creative.

But there are annoying jobs that suck up a surprising amount of time:

- Choosing the correct slug for each post
- Writing an SEO description for each post
- Attaching posts to lists and ensuring they're in the correct order
- Adding tags to posts

So I'm going to create an AI agent to automate a lot of this work.

## The Setup

For this example, I've created a dummy CMS using Hono which saves a bunch of posts into a JSON file locally.

```ts
const honoApp = new Hono();

honoApp.post("/api/cms/posts", async (c) => {
  // Create a post
});

honoApp.get("/api/cms/posts", async (c) => {
  // Get all posts
});

honoApp.get("/api/cms/posts/:id", async (c) => {
  // Get single post
});

honoApp.put("/api/cms/posts/:id", async (c) => {
  // Update a post
});

honoApp.delete("/api/cms/posts/:id", async (c) => {
  // Delete a post
});
```

For the purposes of this exercise, I'm going to imagine that this is not on my API but on some third-party API.

In other words, there's a network boundary between my agent and the CMS.

So, I've created a CMS client in `cms-client.ts`, which fetches from the CMS. This gives us helper methods like `getAllPosts`.

```ts ! example.ts
import { createCmsClient } from "./cms-client.ts";

const client = createCmsClient();

// Example: Get all posts
const posts = await client.getAllPosts();
```

Our agent will live at API, at `/api/chat`.

```ts
honoApp.post("/api/chat", async (c) => {
  // Agent goes here
});
```

We're going to contact this agent from our SPA (Single Page App), at `localhost:3000`. I'm using Vite as my dev server, and React as my frontend framework.

## The Basics

<Scrollycoding>

# !!steps

We'll start by using the [streamText](https://www.aihero.dev/streaming-text-with-vercel-ai-sdk) function, passing it a model and the message history, which we'll receive from the client.

```ts ! example.ts
import { streamText } from "ai";

honoApp.post("/api/chat", async (c) => {
  const { messages } = await c.req.json();
  const result = await streamText({
    messages,
    model,
  });

  return result;
});
```

# !!steps

Let's now add a helpful [system prompt](https://www.aihero.dev/system-prompts-with-vercel-ai-sdk).

```ts ! example.ts
import { streamText } from "ai";

honoApp.post("/api/chat", async (c) => {
  const { messages } = await c.req.json();
  const result = await streamText({
    messages,
    model,
    system:
      `You are a content management agent. ` +
      `You help to update a CMS based on user input. ` +
      `Think step-by-step. ` +
      `Before updating content, offer the user the chance to make changes. `,
  });

  return result;
});
```

# !!steps

We should add `maxSteps`, to let the agent [respond to the results of its own tool calls](https://www.aihero.dev/agents-with-vercel-ai-sdk):

```ts ! example.ts
import { streamText } from "ai";

honoApp.post("/api/chat", async (c) => {
  const { messages } = await c.req.json();
  const result = await streamText({
    messages,
    model,
    system:
      `You are a content management agent. ` +
      `You help to update a CMS based on user input. ` +
      `Think step-by-step. ` +
      `Before updating content, offer the user the chance to make changes. `,
    maxSteps: 10,
  });

  return result;
});
```

# !!steps

Finally, let's add a tools record, which we'll implement below.

```ts ! example.ts
import { streamText } from "ai";

const tools = {};

honoApp.post("/api/chat", async (c) => {
  const { messages } = await c.req.json();
  const result = await streamText({
    messages,
    model,
    system,
    maxSteps: 10,
    tools,
  });

  return result;
});
```

</Scrollycoding>

## The Tools

Now that the agent has its basic setup, we can give access to the tools it needs to actually do things in the CMS.

<Scrollycoding>

# !!steps

Let's start by letting it view all of the posts in the CMS.

We give the tool an empty object of parameters, a description (for prompt engineering purposes) and an `execute` function.

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const tools = {
  viewPosts: tool({
    parameters: z.object({}),
    description: "View all posts",
    execute: () => {
      return client.getAllPosts();
    },
  }),
};
```

# !!steps

There is a slight issue here. By default `client.getAllPosts()` returns the `content` of the post too.

If we return that from our tool, that will get put into the prompt of the next LLM call.

That's a lot of tokens that we're burning on something that doesn't need to be in the prompt.

So we should filter out the body of the post before returning it.

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const tools = {
  viewPosts: tool({
    parameters: z.object({}),
    description:
      "View all posts, without the post content",
    execute: async () => {
      const result = await client.getAllPosts();

      return result.map(({ content, ...rest }) => {
        return rest;
      });
    },
  }),
};
```

</Scrollycoding>

<Scrollycoding>

# !!steps

Next we'll let it view a specific post. In this one we need to pass in an `id` parameter.

The `id` parameter is so self-explanatory that I don't feel the need to include a `.describe` function.

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const tools = {
  // ...other tools
  viewPost: tool({
    parameters: z.object({ id: z.string() }),
    description:
      "View a specific post, including its content",
    execute: async ({ id }) => {
      return await client.getPost(id);
    },
  }),
};
```

# !!steps

Next, let's create a post.

Here, the `.describe` functions make more sense. For instance, we want to specify that the content is in markdown format.

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const tools = {
  // ...other tools
  createPost: tool({
    parameters: z.object({
      title: z
        .string()
        .describe("The title of the post"),
      content: z
        .string()
        .describe(
          `The post's content, in markdown format`,
        ),
    }),
    description: "Create a new post",
    execute: async ({ title, content }) => {
      return await client.createPost({
        title,
        content,
      });
    },
  }),
};
```

</Scrollycoding>

Finally, we add `updatePost` and `deletePost`, which follow the same pattern as the previous tools:

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const tools = {
  // ...other tools
  updatePost: tool({
    parameters: z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
    }),
    description:
      "Update a specific post with a new title and content",
    execute: async ({ id, title, content }) => {
      const result = await client.updatePost(id, {
        title,
        content,
      });

      return result;
    },
  }),
  deletePost: tool({
    parameters: z.object({ id: z.string() }),
    description: "Delete a specific post",
    execute: async ({ id }) => {
      return await client.deletePost(id);
    },
  }),
};
```

## Trying It Out

Now we have all our tools set up, let's try out the agent.

Let's ask it to view all the posts in a markdown table:

<!-- Insert screenshot -->

Now, let's get it to delete all posts.

## Human In The Loop

It's pretty scary to me how quickly it just deleted a bunch of posts.

I was not remotely involved in that process. I don't feel particularly comfortable handing over the keys to my data to the `LLM`.

So let's take the keys away. I'm going to ask the agent to confirm each deletion with me.

I could, of course, just ask the `LLM` via the system prompt to confirm every decision with me.

But that's flaky and scary. I want to make it programmatically impossible for the LLM to do anything I don't want it to.

### Extracting the `execute` Functions

The way to do that is to remove the `execute` functions from each potentially destructive tool.

<Scrollycoding>

# !!steps

Let's take `updatePost` as an example.

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const tools = {
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
};
```

# !!steps

I'm going to take its `execute` function and move it into an object of `dangerousToolExecutors`:

```ts ! example.ts
import { tool } from "ai";
import { z } from "zod";

const dangerousToolExecutors = {
  updatePost: async ({ id, title, content }) => {
    return await client.updatePost(id, {
      title,
      content,
    });
  },
};

const tools = {
  // ...other tools
  updatePost: tool({
    parameters: z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
    }),
    description:
      "Update a specific post with a new title and content",
  }),
};
```

</Scrollycoding>

I'll also do the same for `deletePost` and `createPost`, but I'll hide that for brevity.

### Setting Up The Confirmation Endpoint

Next, I'm going to create an API endpoint for handling these tool calls.

<Scrollycoding>

# !!steps

It'll receive the tool name and arguments...

```ts
honoApp.post("/api/call-tool", async (ctx) => {
  const { toolName, args } = await ctx.req.json();
});
```

# !!steps

...and call the appropriate function from `dangerousToolExecutors`.

This means we'll be able to confirm the use of these dangerous tools from the frontend.

```ts
honoApp.post("/api/call-tool", async (ctx) => {
  const { toolName, args } = await ctx.req.json();

  const result = await (dangerousToolExecutors as any)[
    toolName
  ]?.(args);

  return ctx.json(result);
});
```

</Scrollycoding>

### Building The Frontend

Finally, we're going to set this all up in the frontend.

The plan here is when the LLM calls a tool, because the tool doesn't have an execute function it will pause.

We'll be able to catch that pause in the frontend. We'll then ask the user if they want to proceed.

If they want to proceed we'll pass the information to the call tool endpoint.

It'll give us back the information we want, and we'll pass that back to the LLM as a tool result.

So it's like the LLM tried to call the tool, took a little break, and then received the result as normal.
