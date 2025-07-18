import { evalite } from "evalite";
import { askDeepSearch } from "../src/deep-search";
import type { Message } from "ai";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: Message[] }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            content: "What is the latest version of TypeScript?",
          },
        ],
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content: "What are the main features of Next.js 15?",
          },
        ],
      },
      {
        input: [
          {
            id: "3",
            role: "user",
            content: "How do I create a React component?",
          },
        ],
      },
      {
        input: [
          {
            id: "4",
            role: "user",
            content: "Compare Python and JavaScript for web development.",
          },
        ],
      },
      {
        input: [
          {
            id: "5",
            role: "user",
            content: "What happened at Google I/O 2024?",
          },
        ],
      },
      {
        input: [
          {
            id: "6",
            role: "user",
            content: "Show me a tutorial for setting up PostgreSQL on Mac.",
          },
        ],
      },
      {
        input: [
          {
            id: "7",
            role: "user",
            content: "Who won the FIFA World Cup in 2022?",
          },
        ],
      },
      {
        input: [
          {
            id: "8",
            role: "user",
            content:
              "What are the best resources to learn Rust programming right now?",
          },
        ],
      },
    ];
  },
  task: async (input) => {
    return askDeepSearch(input);
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
  ],
});
