import { generateText } from "ai";
import { prompt } from "@promptbook/utils";
import { smallModel } from "../../_shared/models.ts";
import { readFileSync } from "fs";
import path from "path";

const model = smallModel;

export const summarizeText = async (input: string) => {
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

  return text;
};

const text = readFileSync(
  path.join(
    import.meta.dirname,
    "fox-who-devoured-history.md",
  ),
  "utf-8",
);

const summary = await summarizeText(text);

console.log(summary);
