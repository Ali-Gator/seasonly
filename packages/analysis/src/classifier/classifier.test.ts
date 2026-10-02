/**
 * @see openspec/specs/season-classifier/spec.md
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeFixtureFace } from "../__tests__/pipeline.ts";
import { seasonFamily, SEASON_SLUGS } from "../palettes/index.ts";
import type { Traits } from "../sampling/index.ts";
import {
  classify,
  QuizAnswersSchema,
  REFERENCE_POINTS,
  type QuizAnswers,
  type SeasonResult,
} from "./index.ts";

const WARM: QuizAnswers = { veins: "green", jewelry: "gold" };
const COOL: QuizAnswers = { veins: "blue", jewelry: "silver" };
const ALL_UNSURE: QuizAnswers = {
  veins: "unsure",
  jewelry: "unsure",
  sun: "unsure",
  hair: "unsure",
};
const ALL_NEUTRAL: QuizAnswers = { veins: "mix", jewelry: "both", sun: "burn-tan", hair: "medium" };

const at = (temperature: number, value: number, clarity: number): Traits => ({
  temperature,
  value,
  clarity,
});
const between = (a: Traits, b: Traits, t: number): Traits =>
  at(
    a.temperature + (b.temperature - a.temperature) * t,
    a.value + (b.value - a.value) * t,
    a.clarity + (b.clarity - a.clarity) * t,
  );
const result = (r: SeasonResult | null): SeasonResult => {
  if (!r) throw new Error("expected a result");
  return r;
};

describe("nearest reference point", () => {
  /** {@link openspec/specs/season-classifier/spec.md#scenario-traits-at-a-seasons-reference-point} */
  it.each(SEASON_SLUGS)("returns %s on its own reference point", (slug) => {
    const r = result(classify({ photo: REFERENCE_POINTS[slug] }));
    expect(r.season).toBe(slug);
    expect(r.runnerUp).not.toBe(slug);
    expect(SEASON_SLUGS).toContain(r.runnerUp);
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-soft-autumn-traits} */
  it("returns soft-autumn for warm-leaning, medium, soft traits", () => {
    expect(result(classify({ photo: at(0.35, 0.05, -0.7) })).season).toBe("soft-autumn");
  });

  /** {@link openspec/specs/season-classifier/spec.md#requirement-the-classifier-returns-one-of-the-12-seasons} */
  it("returns the combined traits it classified", () => {
    const photo = at(0.35, 0.05, -0.7);
    expect(result(classify({ photo })).traits).toEqual(photo);
    const withQuiz = result(classify({ photo, answers: COOL }));
    expect(withQuiz.traits.temperature).toBeLessThan(photo.temperature);
    expect(withQuiz.traits.value).toBe(photo.value);
    expect(withQuiz.traits.clarity).toBe(photo.clarity);
  });
});

describe("confidence", () => {
  const sa = REFERENCE_POINTS["soft-autumn"];
  const ss = REFERENCE_POINTS["soft-summer"];
  const midpoint = between(sa, ss, 0.5);

  /** {@link openspec/specs/season-classifier/spec.md#scenario-on-a-reference-point} */
  it("is 1 on a reference point", () => {
    for (const slug of SEASON_SLUGS)
      expect(result(classify({ photo: REFERENCE_POINTS[slug] })).confidence).toBe(1);
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-halfway-between-two-seasons} */
  it("is 0 halfway between soft-autumn and soft-summer", () => {
    const r = result(classify({ photo: midpoint }));
    expect(r.confidence).toBe(0);
    expect([r.season, r.runnerUp].sort()).toEqual(["soft-autumn", "soft-summer"]);
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-closer-to-one-season} */
  it("rises from the midpoint toward a season", () => {
    const steps = [0, 0.1, 0.2, 0.4, 0.6, 0.8].map(
      (t) => result(classify({ photo: between(midpoint, sa, t) })).confidence,
    );
    for (let k = 1; k < steps.length; k++) expect(steps[k]).toBeGreaterThan(steps[k - 1] ?? 2);
    expect(steps.at(-1)).toBeLessThan(1);
  });

  it("always has two decimals, between 0 and 1", () => {
    const grid = [-1, -0.55, -0.1, 0.3, 0.75, 1];
    for (const t of grid)
      for (const v of grid)
        for (const c of grid) {
          const { confidence } = result(classify({ photo: at(t, v, c) }));
          expect(confidence).toBeGreaterThanOrEqual(0);
          expect(confidence).toBeLessThanOrEqual(1);
          expect(Math.round(confidence * 100) / 100).toBe(confidence);
        }
  });
});

describe("quiz answers with a photo", () => {
  /** {@link openspec/specs/season-classifier/spec.md#scenario-a-borderline-photo-with-warm-answers} */
  it("tip a borderline photo warm", () => {
    const border = between(REFERENCE_POINTS["soft-autumn"], REFERENCE_POINTS["soft-summer"], 0.5);
    const season = result(classify({ photo: border, answers: WARM })).season;
    expect(["spring", "autumn"]).toContain(seasonFamily(season));
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-a-clearly-cool-photo-with-warm-answers} */
  it("do not override a clearly cool photo", () => {
    for (const slug of SEASON_SLUGS.filter((s) => ["summer", "winter"].includes(seasonFamily(s)))) {
      const season = result(classify({ photo: REFERENCE_POINTS[slug], answers: WARM })).season;
      expect(["summer", "winter"], slug).toContain(seasonFamily(season));
    }
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-unsure-answers} */
  it("count as nothing when unsure or neutral", () => {
    const photo = at(0.2, -0.3, 0.1);
    const none = classify({ photo });
    expect(classify({ photo, answers: ALL_UNSURE })).toEqual(none);
    expect(classify({ photo, answers: ALL_NEUTRAL })).toEqual(none);
    expect(classify({ photo, answers: {} })).toEqual(none);
  });
});

describe("quiz alone", () => {
  /** {@link openspec/specs/season-classifier/spec.md#scenario-quiz-only} */
  it("classifies a cool, light quiz as a Summer at confidence 0.6 or less", () => {
    const r = result(
      classify({ answers: { veins: "blue", jewelry: "silver", sun: "burn", hair: "blonde" } }),
    );
    expect(seasonFamily(r.season)).toBe("summer");
    expect(r.confidence).toBeLessThanOrEqual(0.6);
    expect(r.agreement).toBe("quiz-only");
  });

  it("never goes above 0.6 confidence, with two decimals", () => {
    const values = {
      veins: ["green", "blue", "mix", "unsure"],
      jewelry: ["gold", "silver", "both", "unsure"],
      sun: ["burn", "burn-tan", "tan", "unsure"],
      hair: ["dark", "medium", "blonde", "red", "unsure"],
    } as const;
    for (const veins of values.veins)
      for (const jewelry of values.jewelry)
        for (const sun of values.sun)
          for (const hair of values.hair) {
            const r = classify({ photo: null, answers: { veins, jewelry, sun, hair } });
            if (!r) continue;
            expect(r.confidence).toBeLessThanOrEqual(0.6);
            expect(Math.round(r.confidence * 100) / 100).toBe(r.confidence);
          }
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-nothing-to-go-on} */
  it("returns nothing when every answer is unsure", () => {
    expect(classify({ answers: ALL_UNSURE })).toBeNull();
    expect(classify({})).toBeNull();
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-only-neutral-answers} */
  it("returns nothing when every answer is neutral", () => {
    expect(classify({ answers: ALL_NEUTRAL })).toBeNull();
  });
});

describe("quiz answer validation", () => {
  /** {@link openspec/specs/season-classifier/spec.md#scenario-an-unknown-answer-value} */
  it("refuses an unknown value, naming the field", () => {
    const parsed = QuizAnswersSchema.safeParse({ veins: "purple" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((i) => i.path)).toEqual([["veins"]]);
  });

  it("refuses an unknown question, naming it", () => {
    const parsed = QuizAnswersSchema.safeParse({ eyes: "blue" });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("eyes");
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-missing-answers} */
  it("accepts a lone jewelry answer, the rest counting as unsure", () => {
    const parsed = QuizAnswersSchema.safeParse({ jewelry: "gold" });
    expect(parsed.success).toBe(true);
    const photo = at(0, 0.1, -0.2);
    expect(classify({ photo, answers: parsed.data })).toEqual(
      classify({ photo, answers: { ...ALL_UNSURE, jewelry: "gold" } }),
    );
  });
});

describe("agreement", () => {
  /** {@link openspec/specs/season-classifier/spec.md#scenario-warm-photo-cool-answers} */
  it("says differ for a warm photo and cool answers", () => {
    const photo = REFERENCE_POINTS["true-autumn"];
    expect(result(classify({ photo, answers: COOL })).agreement).toBe("differ");
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-a-near-neutral-photo} */
  it("says agree for a near-neutral photo and cool answers", () => {
    expect(result(classify({ photo: at(0.1, 0, 0), answers: COOL })).agreement).toBe("agree");
  });

  it("says agree when photo and answers point the same way", () => {
    const photo = REFERENCE_POINTS["true-autumn"];
    expect(result(classify({ photo, answers: WARM })).agreement).toBe("agree");
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-photo-without-answers} */
  it("says photo-only when every answer is unsure", () => {
    const photo = REFERENCE_POINTS["true-autumn"];
    expect(result(classify({ photo, answers: ALL_UNSURE })).agreement).toBe("photo-only");
  });
});

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");

describe("determinism", () => {
  /** {@link openspec/specs/season-classifier/spec.md#scenario-one-photo-analyzed-twice} */
  it("gives deeply equal results for one photo analyzed twice in one process", () => {
    const [a, b] = [analyzeFixtureFace(), analyzeFixtureFace()];
    expect(a.result).not.toBeNull();
    expect(a).toEqual(b);
  });

  /** {@link openspec/specs/season-classifier/spec.md#scenario-one-photo-analyzed-in-separate-processes} */
  it("gives deeply equal results in two separate Node processes", () => {
    const child = () =>
      execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          'const m = await import("./packages/analysis/src/__tests__/pipeline.ts"); console.log(JSON.stringify(m.analyzeFixtureFace()));',
        ],
        { cwd: REPO_ROOT, encoding: "utf8" },
      );
    const [a, b] = [child(), child()];
    expect(JSON.parse(a)).toEqual(JSON.parse(b));
    expect(JSON.parse(a)).toEqual(JSON.parse(JSON.stringify(analyzeFixtureFace())));
  });
});
