import { evalite } from "evalite";
import { askDeepSearch } from "../src/app/api/chat/deep-search";
import type { Message } from "ai";
import { Factuality } from "../src/lib/factuality-scorer";
import { devData } from "./dev.ts";
import { ciData } from "./ci.ts";
import { regressionData } from "./regression.ts";
import { env } from "../src/env";

evalite("Deep Search Eval", {
  data: async () => {
    const merged = [...devData];
    if (env.EVAL_DATASET === "ci") {
      merged.push(...ciData);
    } else if (env.EVAL_DATASET === "regression") {
      merged.push(...ciData, ...regressionData);
    }
    return merged;
  },
  task: async (input: string) => {
    const messages: Message[] = [
      {
        id: "1",
        role: "user",
        content: input,
      },
    ];
    return askDeepSearch(messages);
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Markdown link: [text](url)
        const containsLinks = /\[[^\]]+\]\([^\)]+\)/.test(output);
        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
  ],
});
