Sometimes you need the AI to act in a certain way no matter what prompt it receives.

In this example, we want the AI to summarize the text that it receives.

We want to give it a role. We want to give it instructions.

And we want to do all of that before it receives the prompt from the user.

<Scrollycoding>

# !!steps

To do that, we can use a system prompt.

Doing that in Vercel's AI SDK is as simple as passing a `system` property.

```ts ! example.ts
const { text } = await generateText({
  model,
  prompt: input,
  system: prompt`
    You are a text summarizer.
    Summarize the text you receive.
    Be concise.
    Return only the summary.
    Do not use the phrase "here is a summary".
    Highlight relevant phrases in bold.
    The summary should be two sentences long.
  `,
});
```

# !!steps

Under the hood, this prepends a special message with a role of "system" that has our system prompt in it.

We could do that in the AI SDK as well if we wanted to. You can pass a `messages` property that has an array of messages.

```ts ! example.ts
const { text } = await generateText({
  model,
  messages: [
    {
      role: "system",
      content: prompt`
        You are a text summarizer.
        Summarize the text you receive.
        Be concise.
        Return only the summary.
        Do not use the phrase "here is a summary".
        Highlight relevant phrases in bold.
        The summary should be two sentences long.
      `,
    },
    {
      role: "user",
      content: input,
    },
  ],
});
```

This can be done in `generateText`, `streamText`, and all of the other APIs that contact LLMs and GenAI.

</Scrollycoding>

Working with system prompts is one of the key parts of working with LLMs, so it's really nice that the AI SDK makes it so easy.

In our next example, we're going to see how easy it is to swap out your models whenever you need to.
