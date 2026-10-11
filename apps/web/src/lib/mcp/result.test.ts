/**
 * The plugin's result builder against the analysis core, over every combination of answers.
 *
 * @see openspec/specs/chat-plugin/spec.md
 */
import {
  classify,
  PALETTES,
  QUIZ_VALUES,
  type QuizAnswers,
  SEASON_COPY,
  SEASON_SLUGS,
} from "@seasonly/analysis";
import { describe, expect, it } from "vitest";

import { familyName, seasonName } from "@/lib/site/routes";

import { PLUGIN_LINK, quizResult } from "./result";

/** Every combination of the four answers, each value or missing: 5 × 5 × 5 × 6. */
const ALL: QuizAnswers[] = (() => {
  let combos: QuizAnswers[] = [{}];
  for (const [question, values] of Object.entries(QUIZ_VALUES)) {
    combos = combos.flatMap((c) => [c, ...values.map((v) => ({ ...c, [question]: v }))]);
  }
  return combos;
})();

const SEASON_NAMES = SEASON_SLUGS.map(seasonName);

const TRUE_AUTUMN = ALL.find((a) => classify({ answers: a }).season === "true-autumn") ?? {};

describe("quizResult", () => {
  it("covers all 750 combinations", () => {
    expect(ALL).toHaveLength(750);
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-parity-with-the-web-quiz} */
  it("gives the core's season family, highlights, tagline and reveal line", () => {
    for (const answers of ALL) {
      const core = classify({ answers });
      const { structured } = quizResult(answers);
      if (core.season === null) {
        expect(structured).toMatchObject({ kind: "no-result", reason: core.reason });
        continue;
      }
      expect(structured).toEqual({
        kind: "season",
        family: familyName(core.season),
        tagline: SEASON_COPY[core.season].tagline,
        revealLine: SEASON_COPY[core.season].revealLine,
        colors: PALETTES[core.season].highlights.map(({ name, hex }) => ({ name, hex })),
        note: expect.stringMatching(/quiz alone.*selfie.*30 colors/),
        link: PLUGIN_LINK,
      });
      expect(structured.kind === "season" && structured.colors).toHaveLength(6);
    }
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-the-subtype-stays-hidden} */
  it("never names the subtype or its slug", () => {
    for (const answers of ALL) {
      const { structured, text } = quizResult(answers);
      const all = JSON.stringify(structured) + text;
      for (const hidden of [...SEASON_NAMES, ...SEASON_SLUGS]) expect(all).not.toContain(hidden);
    }
    // The quiz alone never gives the Soft seasons or Bright Spring, so the scenario uses True Autumn.
    const { text } = quizResult(TRUE_AUTUMN);
    expect(text).toContain("Autumn");
    expect(text).not.toContain("True Autumn");
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-the-link} */
  it("links to the analysis with the plugin's UTM tags", () => {
    expect(PLUGIN_LINK).toBe("https://seasonly.me/analyze?utm_source=chat-plugin&utm_medium=mcp");
    for (const answers of ALL) {
      const { structured, text } = quizResult(answers);
      expect(structured.link).toBe(PLUGIN_LINK);
      expect(text).toContain(PLUGIN_LINK);
    }
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-every-answer-unsure} */
  it("answers all-unsure with no-answers, no season and no colors", () => {
    const { structured, text } = quizResult({
      veins: "unsure",
      jewelry: "unsure",
      sun: "unsure",
      hair: "unsure",
    });
    expect(structured).toEqual({
      kind: "no-result",
      reason: "no-answers",
      title: "These answers don't point to one season",
      message: expect.stringContaining("nothing to go on yet"),
      link: PLUGIN_LINK,
    });
    expect(text).toContain("nothing to go on yet");
    expect(text).not.toMatch(/#[0-9A-F]{6}/);
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-answers-that-cancel-out} */
  it("answers green veins with silver jewelry with answers-cancel", () => {
    const { structured, text } = quizResult({ veins: "green", jewelry: "silver" });
    expect(structured).toMatchObject({ kind: "no-result", reason: "answers-cancel" });
    expect(text).toContain("point in opposite directions");
    expect(text).not.toMatch(/#[0-9A-F]{6}/);
    for (const family of ["Spring", "Summer", "Autumn", "Winter"])
      expect(text).not.toContain(family);
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-a-host-without-ui} */
  it("puts the whole result in the text", () => {
    const { text } = quizResult(TRUE_AUTUMN);
    expect(text).toContain("Autumn");
    expect(text).toContain(SEASON_COPY["true-autumn"].tagline);
    expect(text).toContain(SEASON_COPY["true-autumn"].revealLine);
    for (const { name, hex } of PALETTES["true-autumn"].highlights) {
      expect(text).toContain(`${name} ${hex}`);
    }
    expect(text).toMatch(/quiz alone/);
  });
});
