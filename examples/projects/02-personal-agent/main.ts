import { confirm, log, text } from "@clack/prompts";
import { streamText, tool } from "ai";
import { prompt } from "@promptbook/utils";
import { inspect } from "node:util";
import { z } from "zod";
import {
  cliChat,
  exitProcessIfCancel,
} from "../../_shared/cli-chat.ts";
import { flagshipAnthropicModel } from "../../_shared/models.ts";

const fetchFromAiHero = async (
  path: string,
  init?: Omit<RequestInit, "headers">,
) => {
  const result = await fetch(
    `https://www.aihero.dev/api${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.AI_HERO_TOKEN}`,
      },
    },
  );

  return await result.json();
};

const viewPosts = async () => {
  const posts = (await fetchFromAiHero(
    "/posts",
  )) as any[];

  const massagedPosts = posts.map((post) => ({
    id: post.id,
    type: post.type,
    title: post.fields.title,
    summary: post.fields.summary,
    description: post.fields.description,
    slug: post.fields.slug,
    url: `https://aihero.dev/${post.fields.slug}`,
    state: post.fields.state,
    visibility: post.fields.visibility,
    github: post.fields.github,
    gitpod: post.fields.gitpod,
  }));

  return massagedPosts;
};

const viewPostBody = async (postId: string) => {
  const post = (await fetchFromAiHero(
    `/posts/${postId}`,
  )) as any;

  const massagedPost = {
    id: post.id,
    type: post.type,
    body: post.fields.body,
    title: post.fields.title,
    summary: post.fields.summary,
    description: post.fields.description,
    slug: post.fields.slug,
    url: `https://aihero.dev/${post.fields.slug}`,
    state: post.fields.state,
    visibility: post.fields.visibility,
    github: post.fields.github,
    gitpod: post.fields.gitpod,
  };

  return massagedPost;
};

const confirmWithUser = async (toolCall: {
  toolName: string;
  args: unknown;
}) => {
  log.warn(
    `LLM is requesting to call tool: ${toolCall.toolName} with args:`,
  );
  log.info(inspect(toolCall.args, { colors: true }));
  const confirmation = await confirm({
    message: `OK to proceed?`,
  });

  exitProcessIfCancel(confirmation);

  return confirmation;
};

const viewPostsTool = tool({
  parameters: z.object({}),
  description:
    "View all posts on AI Hero. The body of each post is not included.",
  execute: async () => {
    return viewPosts();
  },
});

const viewPostBodyTool = tool({
  parameters: z.object({
    postId: z.string().min(1),
  }),
  description:
    "View a post, including its body, on AI Hero. Used for fetching the body of the post.",
  execute: async (args) => {
    return viewPostBody(args.postId);
  },
});

const updatePostTool = tool({
  parameters: z.object({
    slug: z.string().min(1),
    postId: z.string().min(1),
    title: z.string().min(1),
    summary: z
      .string()
      .max(160)
      .describe(
        "SEO summary of the post, maximum 160 characters",
      ),
  }),
  description: "Update a post on AI Hero",
  execute: async (args) => {
    const confirmed = await confirmWithUser({
      toolName: "updatePost",
      args,
    });

    if (!confirmed) {
      const confirmationReason = await text({
        message: "Why are you cancelling?",
      });

      exitProcessIfCancel(confirmationReason);

      return `Cancelled by user: ${confirmationReason}`;
    }
    try {
      const result = await fetchFromAiHero(
        `/posts/${args.postId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            id: args.postId,
            fields: {
              title: args.title,
              summary: args.summary,
            },
          }),
        },
      );

      return result;
    } catch (e) {
      return e;
    }
  },
});

const createPostTool = tool({
  description: "Create a post on AI Hero",
  parameters: z.object({
    title: z
      .string()
      .min(1)
      .describe("Title of the post"),
  }),
  execute: async (args) => {
    await confirmWithUser({
      toolName: "createPost",
      args,
    });

    const result = await fetchFromAiHero("/posts", {
      method: "POST",
      body: JSON.stringify({
        title: args.title,
        postType: "lesson",
      }),
    });

    return result;
  },
});

await cliChat({
  intro: "Welcome to the AI Hero Agent!",
  answerQuestion: async (question, messages) => {
    messages.push({
      role: "user",
      content: question,
    });
    const result = streamText({
      model: flagshipAnthropicModel,
      messages: messages,
      system: prompt`
        You have the responsibility for updating the site AI Hero.
        It is a blog teaching AI engineering.
        When mentioning resources (like posts), provide URLs.
        If a tool call fails, show the raw JSON error to the user.
      `,
      tools: {
        viewPostBody: viewPostBodyTool,
        viewPosts: viewPostsTool,
        createPost: createPostTool,
        updatePost: updatePostTool,
      },
      maxSteps: 5,
    });

    return result;
  },
  dollarsPerMillionTokens: 3,
});
