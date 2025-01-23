import { generateText } from "ai";
import { prompt } from "@promptbook/utils";
import { flagshipAnthropicModel } from "../../_shared/models.ts";

const model = flagshipAnthropicModel;

const systemPrompt = prompt`
  You will receive an image.
  Please create an alt text for the image.
  Be concise.
  Use adjectives only when necessary.
  Do not pass 160 characters.
  Use simple language.
`;

export const describeImage = async (
  imageUrl: string,
) => {
  const { text } = await generateText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: new URL(imageUrl),
          },
        ],
      },
    ],
  });

  return text;
};

const description = await describeImage(
  "https://github.com/ai-hero-dev/ai-hero/blob/main/internal/assets/fireworks.jpg?raw=true",
);

console.log(description);
