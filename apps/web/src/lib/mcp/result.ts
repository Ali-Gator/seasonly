/**
 * The plugin's answer to the four quiz answers: the season family, its copy and 6 highlight colors,
 * or why there is none. Every word and color comes from the analysis core, except the card's own
 * lines from the approved canvas boards "22 Chat card" and "22b Chat card · no result".
 *
 * {@link openspec/specs/chat-plugin/spec.md#requirement-the-tool-gives-the-web-quizs-season}
 */
import {
  classify,
  type NoResult,
  PALETTES,
  type QuizAnswers,
  SEASON_COPY,
  type Swatch,
} from "@seasonly/analysis";

import { familyName, ORIGIN } from "@/lib/site/routes";

/** Opens the photo analysis fresh, tagged so PostHog attributes the visit to the plugin. */
export const PLUGIN_LINK = `${ORIGIN}/analyze?utm_source=chat-plugin&utm_medium=mcp`;

export type PluginResult =
  | {
      kind: "season";
      family: string;
      tagline: string;
      revealLine: string;
      colors: Swatch[];
      note: string;
      link: string;
    }
  | {
      kind: "no-result";
      reason: NoResult["reason"];
      title: string;
      message: string;
      link: string;
    };

const NOTE = "From the quiz alone. A selfie gives your exact season and all 30 colors.";

const NO_RESULT_TITLE = "These answers don't point to one season";

const NO_RESULT_MESSAGE: Record<NoResult["reason"], string> = {
  "no-answers":
    "Every answer was “Hard to tell” or in between, so there is nothing to go on yet. Pick the closest answer to each question, or let a selfie read your colors.",
  "answers-cancel":
    "Your answers point in opposite directions: some say warm, others say cool. Check your wrist and jewelry in daylight and answer again, or let a selfie read your colors.",
};

/**
 * `structured` feeds the card; `text` carries the same facts for a host that shows no card.
 * {@link openspec/specs/chat-plugin/spec.md#requirement-answers-with-nothing-to-classify-get-an-answer-not-an-error}
 */
export function quizResult(answers: QuizAnswers): { structured: PluginResult; text: string } {
  const result = classify({ answers });

  if (result.season === null) {
    const message = NO_RESULT_MESSAGE[result.reason];
    return {
      structured: {
        kind: "no-result",
        reason: result.reason,
        title: NO_RESULT_TITLE,
        message,
        link: PLUGIN_LINK,
      },
      text: `${NO_RESULT_TITLE}. ${message}\n\nPhoto analysis: ${PLUGIN_LINK}`,
    };
  }

  const { tagline, revealLine } = SEASON_COPY[result.season];
  const family = familyName(result.season);
  const colors = PALETTES[result.season].highlights.map(({ name, hex }) => ({ name, hex }));
  return {
    structured: {
      kind: "season",
      family,
      tagline,
      revealLine,
      colors,
      note: NOTE,
      link: PLUGIN_LINK,
    },
    text: [
      `Your season family: ${family}. ${tagline}`,
      revealLine,
      `6 of your colors: ${colors.map((c) => `${c.name} ${c.hex}`).join(", ")}.`,
      `${NOTE} Get your full analysis: ${PLUGIN_LINK}`,
    ].join("\n\n"),
  };
}
