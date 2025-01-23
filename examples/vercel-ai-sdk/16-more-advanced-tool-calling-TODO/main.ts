import { generateText, tool } from "ai";
import { prompt } from "@promptbook/utils";
import { z } from "zod";
import { smallModel } from "../../_shared/models.ts";

const model = smallModel;

const systemPrompt = prompt`
  You are interacting with the Star Wars API.
  Use the tools provided to fetch data from the API.
  Make a plan to find the data, then enact that plan step-by-step.
  If you cannot find a record in the Star Wars API, use the index pages to help:

  <index_pages>

  vehicles: https://swapi.py4e.com/api/vehicles/
  planets: https://swapi.py4e.com/api/planets/
  films: https://swapi.py4e.com/api/films/
  people: https://swapi.py4e.com/api/people/

  </index_pages>
`;

export const askSwapiApi = async (prompt: string) => {
  // 1. Call the Vercel SDK, passing in our model (gpt-4o-mini)
  // and the system prompt (next image)
  const { steps, text } = await generateText({
    model,
    system: systemPrompt,
    prompt,
    tools: {
      // 2. We pass in a tool that calls the Star Wars API
      callSwapiApi: tool({
        description: "Call the Star Wars API",
        execute: async ({ endpoint }) => {
          const response = await fetch(endpoint);
          return response.json();
        },
        parameters: z.object({
          endpoint: z
            .string()
            .url()
            .startsWith("https://swapi.py4e.com/api/")
            .describe(
              "The URL to fetch data from, " +
                "such as https://swapi.py4e.com/api/films/",
            ),
        }),
      }),
    },
    // 3. maxSteps makes the model perform multiple
    // cycles, allowing it to interact with the tool
    // multiple times and fetch more data
    maxSteps: 10,
  });

  return { steps, text };
};
