#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-sys --allow-net

import { wizzard } from '@promptbook/wizzard';
import * as p from "@clack/prompts";

export const generateJoke = async () => {

  const topic = (await p.text({
    message: "Topic for joke:",
  })).toString();

  const {
      outputParameters: { joke },
  } = await wizzard.execute(
      `examples/projects/00-joke-generator/joke-generator.book.md`,
      {
        topic
      },
  );

  p.outro(`Here is your joke about ${topic}:`);
  p.outro(joke);
};

generateJoke();