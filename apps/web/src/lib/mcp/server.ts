/**
 * The plugin's MCP server: one read-only tool that classifies the four quiz answers, and the card
 * resource the tool's result renders in.
 *
 * {@link openspec/specs/chat-plugin/spec.md#requirement-the-mcp-endpoint-is-public-and-lists-one-tool}
 */
import type { McpServer } from "@modelcontextprotocol/server";
import { QuizAnswersSchema } from "@seasonly/analysis";
import { z } from "zod";

import { ORIGIN } from "@/lib/site/routes";

import { CARD_HTML } from "./card";
import { quizResult } from "./result";

export const CARD_URI = "ui://seasonly/season-card.html";

const CARD_MIME = "text/html;profile=mcp-app";

/**
 * The core's answers schema, each field described in the quiz's own words. Unknown fields and
 * values are refused, so a photo or free text never reaches the classifier.
 * {@link openspec/specs/chat-plugin/spec.md#requirement-the-tool-takes-the-four-quiz-answers-and-nothing-else}
 */
const InputSchema = z.strictObject({
  veins: QuizAnswersSchema.shape.veins.describe(
    "The color of the veins on the inner wrist in daylight: green (green or olive), blue (blue or purple), mix (a mix of both) or unsure (hard to tell).",
  ),
  jewelry: QuizAnswersSchema.shape.jewelry.describe(
    "Which jewelry looks more natural against the skin: gold, silver, both (both look fine) or unsure (hard to tell).",
  ),
  sun: QuizAnswersSchema.shape.sun.describe(
    "What the skin does in the sun without sunscreen: burn (burns, rarely tans), burn-tan (burns a little, then tans), tan (tans easily, rarely burns) or unsure (hard to tell).",
  ),
  hair: QuizAnswersSchema.shape.hair.describe(
    "The natural hair color, without dye: dark (black or dark brown), medium (medium or light brown), blonde, red (red or auburn) or unsure (hard to tell, gray, or dyed for years).",
  ),
});

export function registerSeasonly(server: McpServer): void {
  /** {@link openspec/specs/chat-plugin/spec.md#requirement-the-tool-is-annotated-read-only} */
  server.registerTool(
    "find_season_family",
    {
      title: "Find my season family",
      description:
        "Finds a person's seasonal color family (Spring, Summer, Autumn or Winter) from four questions about their natural coloring. Returns the family, its tagline and a line on what suits it, and 6 of its colors with names and hex codes. Every answer is optional; a missing answer counts as unsure. When the answers point to no season, it says why. It takes no photo.",
      inputSchema: InputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: { ui: { resourceUri: CARD_URI }, "openai/outputTemplate": CARD_URI },
    },
    async (answers) => {
      const { structured, text } = quizResult(answers);
      return { content: [{ type: "text", text }], structuredContent: structured };
    },
  );

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-no-outside-origin} */
  server.registerResource(
    "season-card",
    CARD_URI,
    { title: "Season family card", mimeType: CARD_MIME },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: CARD_MIME,
          text: CARD_HTML,
          _meta: {
            // The card draws its own border, from the approved board.
            ui: { csp: { connectDomains: [], resourceDomains: [] }, prefersBorder: false },
            // ChatGPT: the link's target, and the dedicated domain its submission requires.
            // `ui.domain` stays unset: its format is host-dependent (design.md, open question 1).
            "openai/widgetCSP": {
              connect_domains: [],
              resource_domains: [],
              redirect_domains: [ORIGIN],
            },
            "openai/widgetDomain": ORIGIN,
          },
        },
      ],
    }),
  );
}
