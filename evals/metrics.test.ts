/**
 * @see openspec/specs/analysis-eval/spec.md
 */
import { describe, expect, it } from "vitest";

import type { EvalPhoto, Season } from "./manifest.ts";
import { metricsOf, type PhotoOutcome, type Problem } from "./metrics.ts";

let n = 0;
/** One photo's outcome: a season for a pass, or a problem. */
function photo(
  person: string,
  label: Season,
  got: Season | Problem,
  extra: Partial<EvalPhoto> & { variants?: PhotoOutcome["variants"] } = {},
): PhotoOutcome {
  const { variants = [], ...fields } = extra;
  const passed = !["no-face", "dark", "tint", "filter", "several-faces"].includes(got);
  return {
    photo: { file: `${person}/${n++}.jpg`, person, season: label, light: "daylight", ...fields },
    problem: passed ? null : (got as Problem),
    season: passed ? (got as Season) : null,
    variants,
  };
}

describe("agreement", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-three-of-four-photos-agree} */
  it("is the share on the most frequent season, and families count separately", () => {
    const out = metricsOf(
      (["soft-autumn", "soft-autumn", "soft-autumn", "true-autumn"] as const).map((s) =>
        photo("p01", "soft-autumn", s),
      ),
    );
    expect(out.metrics.agreement).toBe(0.75);
    expect(out.metrics.familyAgreement).toBe(1);
    expect(out.people[0]).toMatchObject({ person: "p01", season: "soft-autumn", agreement: 0.75 });
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-tie} */
  it("breaks a tie for the label", () => {
    const out = metricsOf(
      (["light-summer", "light-spring", "light-spring", "light-summer"] as const).map((s) =>
        photo("p01", "light-summer", s),
      ),
    );
    expect(out.people[0]).toMatchObject({ season: "light-summer", agreement: 0.5 });
  });

  it("breaks a tie without the label for the earlier slug", () => {
    const out = metricsOf(
      (["true-winter", "light-spring"] as const).map((s) => photo("p01", "soft-summer", s)),
    );
    expect(out.people[0]).toMatchObject({ season: "light-spring", agreement: 0.5 });
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-one-photo-passes} */
  it("lists a person with one passing photo as unmeasured, out of the mean", () => {
    const out = metricsOf([
      photo("p01", "true-autumn", "true-autumn"),
      photo("p01", "true-autumn", "true-autumn"),
      photo("p02", "true-winter", "true-winter"),
      photo("p02", "true-winter", "dark"),
    ]);
    expect(out.metrics.agreement).toBe(1);
    expect(out.people.find((p) => p.person === "p02")).toMatchObject({
      measured: false,
      agreement: null,
    });
  });

  /** {@link openspec/specs/analysis-eval/spec.md#requirement-agreement-is-measured-across-one-persons-photos} */
  it("is the mean over measured people, on usable photos only", () => {
    const out = metricsOf([
      photo("p01", "true-autumn", "true-autumn"),
      photo("p01", "true-autumn", "true-autumn"),
      photo("p02", "true-winter", "true-winter"),
      photo("p02", "true-winter", "deep-winter"),
      // Expected to fail, but passed: not a usable photo, so not counted.
      photo("p02", "true-winter", "light-spring", { expect: "dark" }),
    ]);
    expect(out.metrics.agreement).toBe(0.75);
    expect(out.metrics.familyAgreement).toBe(1);
  });
});

describe("accuracy", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-right-family-wrong-season} */
  it("counts the right family but the wrong season toward family accuracy only", () => {
    const out = metricsOf([
      photo("p01", "deep-winter", "true-winter"),
      photo("p01", "deep-winter", "deep-winter"),
    ]);
    expect(out.metrics.accuracy).toBe(0.5);
    expect(out.metrics.familyAccuracy).toBe(1);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#requirement-accuracy-is-measured-against-the-labels} */
  it("is over every usable photo, so a rejected one counts against it", () => {
    const out = metricsOf([
      photo("p01", "deep-winter", "deep-winter"),
      photo("p01", "deep-winter", "dark"),
    ]);
    expect(out.metrics.accuracy).toBe(0.5);
  });
});

describe("the photo check", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-usable-photo-rejected-as-dark} */
  it("counts usable photos rejected, by problem", () => {
    const out = metricsOf([
      photo("p01", "true-autumn", "dark"),
      photo("p01", "true-autumn", "several-faces"),
      photo("p01", "true-autumn", "true-autumn"),
      photo("p01", "true-autumn", "true-autumn"),
    ]);
    expect(out.metrics.falseRejectRate).toBe(0.5);
    expect(out.metrics.falseRejects).toEqual({
      "no-face": 0,
      dark: 1,
      tint: 0,
      filter: 0,
      "several-faces": 1,
    });
    expect(out.metrics.passRate).toBe(0.5);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#requirement-the-photo-check-is-measured-both-ways} */
  it("rates photos expected to fail on getting exactly that problem", () => {
    const out = metricsOf([
      photo("p01", "true-autumn", "several-faces", { expect: "several-faces" }),
      photo("p01", "true-autumn", "dark", { expect: "tint" }),
      photo("p01", "true-autumn", "true-autumn", { expect: "dark" }),
      photo("p01", "true-autumn", "tint", { expect: "tint" }),
    ]);
    expect(out.metrics.expectedProblemRate).toBe(0.5);
    expect(out.metrics.falseRejectRate).toBeNull();
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-the-grayscale-variant} */
  it("counts a variant that gets its problem as caught", () => {
    const out = metricsOf([
      photo("p01", "true-autumn", "true-autumn", {
        variants: [
          { name: "dark", expected: "dark", problem: "dark" },
          { name: "warm", expected: "tint", problem: "tint" },
          { name: "gray", expected: "filter", problem: "filter" },
        ],
      }),
    ]);
    expect(out.metrics.catchRate).toBe(1);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-usable-photos-variant-that-passes} */
  it("counts a variant that passes, or gets another problem, as missed", () => {
    const out = metricsOf([
      photo("p01", "true-autumn", "true-autumn", {
        variants: [
          { name: "dark", expected: "dark", problem: null },
          { name: "warm", expected: "tint", problem: "dark" },
          { name: "gray", expected: "filter", problem: "filter" },
          { name: "dark", expected: "dark", problem: "dark" },
        ],
      }),
    ]);
    expect(out.metrics.catchRate).toBe(0.5);
  });
});

describe("an empty set", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-an-empty-set} */
  it("gives null metrics", () => {
    expect(metricsOf([])).toEqual({
      metrics: {
        agreement: null,
        familyAgreement: null,
        accuracy: null,
        familyAccuracy: null,
        falseRejectRate: null,
        falseRejects: { "no-face": 0, dark: 0, tint: 0, filter: 0, "several-faces": 0 },
        expectedProblemRate: null,
        catchRate: null,
        passRate: null,
      },
      people: [],
    });
  });
});
