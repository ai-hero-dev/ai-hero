import { generateText } from "ai";
import { smallModel } from "../../_shared/models.ts";
import { prompt } from "@promptbook/utils";

const model = smallModel;

export const summarizeText = async (input: string) => {
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

  return text;
};
