Often the thing that you want to get back from your LLM is not text but some kind of object.

You might want to scan a bank statement for multiple properties, like the account number and the balance.

The most efficient way to do this is with structured outputs.

This lets you ask the LLM a question, tell it what format you want the answer in, and then it will send you that information in that format.

In this example, we're going to ask the LLM for a recipe. We want the recipe name, an array of ingredients, and an array of steps that the chef needs to take to make the recipe.

```json
{
  "recipe": {
    "name": "Chocolate Cake",
    "ingredients": [
      {
        "name": "flour",
        "amount": "2 cups"
      },
      {
        "name": "sugar",
        "amount": "2 cups"
      }
      // ...
    ],
    "steps": [
      "Preheat the oven to 350 degrees F.",
      "Mix the flour, sugar, cocoa powder, baking powder, baking soda, and salt in a large bowl."
      // ...
    ]
  }
}
```

<Scrollycoding>

# !!steps

The first step is to create a `zod` schema that describes the data type that we want to get back from the LLM.

If you've never seen `zod` before, I have a [free tutorial](https://www.totaltypescript.com/tutorials/zod) on my sister site, Total TypeScript.

To describe the recipe shape that we have here the `zod` schema would look like this:

```ts ! example.ts
import { z } from "zod";

const schema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
      }),
    ),
    steps: z.array(z.string()),
  }),
});
```

# !!steps

We can pass this schema directly to the `generateObject` function from the AI SDK.

```ts ! example.ts
import { z } from "zod";
import { generateObject } from "ai";

const schema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
      }),
    ),
    steps: z.array(z.string()),
  }),
});

export const createRecipe = async (prompt: string) => {
  const { object } = await generateObject({
    model,
    schema,
    prompt,
  });

  return object.recipe;
};
```

# !!steps

I've also added a simple system prompt here to give the AI some context as to what we're doing.

The result that comes back contains a property called `object` which contains our recipe.

Thanks to TypeScript being clever, we also get type-safe access to the `name`, `ingredients`, and `steps`.

```ts ! example.ts
import { z } from "zod";
import { generateObject } from "ai";

const schema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
      }),
    ),
    steps: z.array(z.string()),
  }),
});

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

</Scrollycoding>

### Describing Properties

But we're not quite done here. We should provide the AI with more information about what each individual property means.

Currently, all it's got to go on are `name`, `ingredients`, and `steps`.

We can do this by adding `zod`'s `describe` function on each property.

```ts
const schema = z.object({
  recipe: z.object({
    name: z
      .string()
      .describe("The title of the recipe"),
    ingredients: z
      .array(
        z.object({
          name: z.string(),
          amount: z.string(),
        }),
      )
      .describe(
        "The ingredients needed for the recipe",
      ),
    steps: z
      .array(z.string())
      .describe("The steps to make the recipe"),
  }),
});
```

Now it's clear to the AI what we're asking for from each property. This is especially useful when the property names are not that descriptive.

And finally, we can pass a `schemaName` property to the `generateObject` function:

```ts
const { object } = await generateObject({
  model,
  system: prompt`
    You are helping a user create a recipe.
    Use British English variants of ingredient names, like Coriander over Cilantro.
  `,
  schemaName: "Recipe",
  schema,
  prompt,
});
```

Let's give this a go and see what outputs we get. Let's ask how to make Baba Ganoush.

```ts
const recipe = await createRecipe(
  "How to make baba ganoush?",
);

console.dir(recipe, { depth: null });
```

When we run this, we're going to get back a recipe for Baba Ganoush.

```json
{
  "name": "Baba Ganoush",
  "ingredients": [
    { "name": "Aubergine", "amount": "2 large" },
    { "name": "Tahini", "amount": "3 tablespoons" }
    // ...
  ],
  "steps": [
    "Preheat the oven to 200°C (400°F).",
    "Pierce the aubergines several times with a fork."
    // ...
  ]
}
```

And there we go, that's how you get structured outputs from the AI SDK.