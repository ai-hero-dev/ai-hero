import { generateObject } from "ai";
import { prompt } from "@promptbook/utils";
import { z } from "zod";
import { smallToolCallingModel } from "../../_shared/models.ts";

const model = smallToolCallingModel;

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

export const createRecipe = async (prompt: string) => {
  const { object } = await generateObject({
    model,
    schema,
    prompt,
    schemaName: "Recipe",
    system: prompt`
      You are helping a user create a recipe.
      Use British English variants of ingredient names,
      like Coriander over Cilantro.
    `,
  });

  return object.recipe;
};

const recipe = await createRecipe(
  "How to make baba ganoush?",
);

console.dir(recipe, { depth: null });
