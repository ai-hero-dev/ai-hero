<Scrollycoding>

# !!steps

In the previous example, I showed you how to get structured outputs from an LLM, but the outputs were all generated at once.

We waited for a little bit and then we saw all the outputs at once.

```ts ! example.ts
export const createRecipe = async (prompt: string) => {
  const { object } = await generateObject({
    model,
    schema,
    prompt,
    system: prompt`
      You are helping a user create a recipe.
      Use British English variants of ingredient names,
      like Coriander over Cilantro.
    `,
  });

  return object.recipe;
};
```

# !!steps

What if you want to see the output as they're generated? In other words, what if you want to stream an object?

You can do that by changing `generateObject` to `streamObject`.

```ts ! example.ts
export const createRecipe = async (prompt: string) => {
  const result = await streamObject({
    model,
    system: prompt`
      You are helping a user create a recipe.
      Use British English variants of ingredient names,
      like Coriander over Cilantro.
    `,
    schemaName: "Recipe",
    schema,
    prompt,
  });

  const finalObject = await result.object;

  return finalObject.recipe;
};
```

</Scrollycoding>

You'll notice a couple of changes from the previous example.

First of all, we have to wait for the final result of the object. We're doing that by awaiting `result.object`.

The reason for this is that `streamObject` returns its result as soon as the first chunk comes in. Awaiting `result.object` means we can wait for the final object.

## Retrieving Partial Objects

If we want access to the partial object as it's being generated, we can use `result.partialObjectStream`.

```ts
export const createRecipe = async (prompt: string) => {
  const result = await streamObject({
    model,
    system: prompt`
      You are helping a user create a recipe.
      Use British English variants of ingredient names,
      like Coriander over Cilantro.
    `,
    schemaName: "Recipe",
    schema,
    prompt,
  });

  for await (const obj of result.partialObjectStream) {
    console.clear();
    console.dir(obj, { depth: null });
  }

  const finalObject = await result.object;

  return finalObject.recipe;
};
```

This is an async iterable. That means we can use a `for await...of` loop to log every update to the object as it's posted to us.

We're going to clear the console first and then log the object so we should see it streaming in live.

Let's give this a go and see what outputs we get. Let's ask it how to make hummus.

```ts
const recipe = await createRecipe(
  "How to make hummus?",
);
```

As you can see, the objects are coming in as they're generated and building the object up over time.

Then the final chunk of this stream contains the entire object.

## Use Cases

The way you'd use this in an application is instead of just logging things to the console, you would send these chunks over the network.

That way, your users could see the object being built up in real time. It's always much nicer to see a progress indicator instead of it just waiting and then spitting it all out in one chunk.

So that's what the `streamObject` function does in the AI SDK.