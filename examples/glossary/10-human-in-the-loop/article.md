There's a pattern when you're working with AI agents that can take a useless system and turn it into a highly accurate one.

And when you understand it, you'll understand why some AI implementations are successful and some aren't.

It's called "Human in the loop."

## What Is Human In The Loop?

Human in the loop is an [old idea](https://en.wikipedia.org/wiki/Human-in-the-loop). And it applies to many many different fields. But I'm going to talk about it primarily in the context of AI agents.

An agent is an LLM strapped up to a feedback loop. It's a system that can learn from and interact with the world.

Adding human feedback as part of that loop can dramatically improve the performance of the agent.

There's a reason that chat interfaces are so popular for LLM providers. You're in a continuous dialogue with the LLM. If it gets something wrong you can correct it.

That's the essence of Human in the loop - human feedback to improve the performance of a system.

## Why Is Human In The Loop Important?

The dream for agents is complete autonomy. You should be able to give them a task and they complete it perfectly every time.

But this is unrealistic for a couple of reasons.

### Ambiguity Of Instructions

First of all, the accuracy of the agent is dependent on the quality of the instructions it's given.

If you say to the agent "book my child in for soft play in Birmingham", how does the agent know if you mean Birmingham, Alabama or Birmingham, UK?

The agent can't know. It needs more information - it needs to know where you live. It _might_ be able to retrieve it from some kind of database of user information.

But the simpler solution is just to ask you. So a level of interactivity with the prompter always has a beneficial effect on the accuracy of the agent.

### Confirming Destructive Actions

Secondly, for an agent to be useful it has to have a level of power. It has to be able to make changes in the world.

Some of those changes may not be able to be rolled back - like deleting a file or sending an email.

This honestly kind of freaks me out about AI agents. I don't want to give an inherently probabilistic system too much power. If you roll the dice for long enough, you're going to eventually hit double ones.

So confirming destructive actions is a natural way to put some bounds on the LLM while retaining its usefulness.

## How Do You Implement Human In The Loop?

There are a few things you want to think about when implementing Human in the loop.

### 'Soft' Human In The Loop

First you can prime the agent to ask for feedback using the **system prompt**.

You can specify it to ask exactly what it needs to know to complete the task.

```ts
import { streamText } from "ai";

const result = streamText({
  model,
  system:
    `You are a helpful booking agent. ` +
    `If you don't know a piece of information before ` +
    `making the booking, ask the user for it. ` +
    `You need to know: ` +
    `1. The name of the people going. ` +
    `2. The activity. ` +
    `3. The location. ` +
    `4. The time. ` +
    `5. Any other special requirements. `,
  prompt:
    "Book my child in for soft play in Birmingham town centre.",
});
```

This is a 'soft' way to implement Human in the loop. Primed this way the agent will likely ask for feedback more often than otherwise.

### 'Hard' Human In The Loop

But you can also implement a harder version, which is especially important when you're dealing with destructive tool calls.

It's pretty simple. Let's say we have a tool that deletes files on our file system.

Instead of calling the tool directly, you wait for user feedback before calling it.

Then you call it and feed the result back to the LLM.

This way the LLM literally cannot call the tool without the user's permission.

We'll be looking into the implementation of this later.

## Conclusion

So that's Human in the loop. It's a simple idea, but key to making AI agents work effectively.
