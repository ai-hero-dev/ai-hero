// Note: You'll want to modify these evals, since they may be out of date.
// You should choose your own evals because we are actively testing for recency.

import type { Message } from "ai";
import { evalite } from "evalite";
import { askDeepSearch } from "~/deep-search";
import { Factuality } from "~/factuality-scorer";

evalite("Arsenal", {
  data: async (): Promise<{ input: string; expected: string }[]> => {
    return [
      {
        input: "Who cost more to sign, Bukayo Saka or Gabriel Martinelli?",
        expected: `Gabriel Martinelli was signed from Ituano for 7.10m euros.
          Bukayo Saka came from Arsenal's academy, so he cost no money to sign.`,
      },
      {
        input: `Arsenal sold several players in the 2024 summer transfer window.
          Which of those players is performing best?`,
        expected: `Reiss Nelson was sold to Fulham in 2024 for 18m euros.
          He is not playing often for Fulham - 11 games this season with one goal.
          Emile Smith Rowe was also sold to Fulham in 2024 for £27 million.
          He is playing regularly for Fulham - 35 games this season with 5 goals.
          Aaron Ramsdale was sold to Southampton in 2024 for £18m.
          He is playing regularly - 25 games this season, though Southampton are
          performing poorly which reflects badly on a goalkeeper.

          Overall, Emile Smith Rowe is probably performing the best.
        `,
      },
      {
        input: `Which of Arsenal's players was injured the most in the 2024-2025 season?
          Which of these injuries impacted Arsenal's performance the most?`,
        expected: `Takehiro Tomiyasu's injury was the longest.
          Kai Havertz was also injured, and his injury was very impactful.
          Bukayo Saka has been injured for less time than Kai Havertz, but
          since he is a better player than Havertz, his injury has impacted
          Arsenal's performance more.
          Gabriel Magalhaes was also injured recently, but Jakob Kiwior has
          deputised well.
          Gabriel Jesus was also injured, and was out for a long time. His absence
          led to Mikel Merino (a defensive midfielder by trade) playing up front.
          `,
      },
      {
        input: `Why didn't Arsenal win the league this season?`,
        expected: `Arsenal were good enough to win the league this season,
          but were hampered by injuries to players at the wrong time.
          They had some unfortunate red cards at the beginning of the season,
          and it's arguable this hurt their momentum.
          However, the injuries were the most impactful reason.
          Many felt that since Manchester City dropped off in the 2024/25 season,
          Arsenal were the best team remaining and should have won the league.
          However, Liverpool ended up winning the league.
          At the time of writing, the league is not finished - but Liverpool
          are many points clear of Arsenal.
        `,
      },
      {
        input: `Which Arsenal player has played the most minutes this season?`,
        expected: `
          The player who has played the most minutes this season is the goalkeeper, David Raya,
          with 4,350 minutes. This is across all competitions, including the Premier League,
          FA Cup, League Cup, and Champions League.

          `,
      },
      {
        input: `Which Arsenal player has scored the most goals in the Champions League in the 2024-2025 season?`,
        expected: `Bukayo Saka: 5 goals`,
      },
      {
        input: `In this season, are Arsenal better in the first half of games, or the second half of games?`,
        expected: `Arsenal are winning the 'first half table', a premier league table that
          only includes the first half of each game. They have a +18 goal difference at the
          start of games, and would have scored 63 points if the table did not include
          the second half of games.

          However, they are worse in the second half of games. They would have scored
          54 points in the second half of games, compared to 63 in the first half.
          Liverpool are the best team in the second half of games, with 75 points.`,
      },
      {
        input: `How do I pnpm upgrade only a certain set of dependencies - ones starting with @tanstack`,
        expected: `pnpm upgrade "@tanstack/*"`,
      },
      {
        input: "How do you do a 404 page in tanstack start?",
        expected: `
        import { createRouter, Link } from '@tanstack/react-router'

        const router = createRouter({
          defaultNotFoundComponent: () => {
            return (
              <div>
                <p>Not found!</p>
                <Link to="/">Go home</Link>
              </div>
            )
          },
        })
        `,
      },
      {
        input: "How do I export subtitles from DaVinci Resolve?",
        expected: `Exporting Subtitles as a Separate File (SRT):

Deliver Page: Go to the Deliver page in DaVinci Resolve.
Render Settings: In the "Render Settings" panel, make sure to check the "Export Subtitle" option.
Format: Choose "Subtitle Files (*.srt)" or your desired format. SRT is widely compatible.
Burn into Video: Uncheck the "Burn into video" option if you want a separate subtitle file.
Export: Add the job to the render queue and render. DaVinci Resolve will create both the video file and a separate .srt file.`,
      },
      // {
      //   input: `Which Arsenal player has scored the most goals from corners in the 2024-2025 season, in the Champions League?`,
      //   expected: ``,
      // },
    ];
  },
  task: async (input) => {
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
        // Regular expression to match markdown links [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks = markdownLinkRegex.test(output);
        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
  ],
});
