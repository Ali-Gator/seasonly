/**
 * The classifier's tunable numbers: each season's reference point and what each quiz answer adds.
 *
 * The reference points were checked against the eval set (t6-eval-set, 2026-10-09): no move
 * tried (softer soft seasons, less light light seasons, less deep deep seasons, less extreme
 * true and bright seasons) raised both agreement and label accuracy, so they stay as first set.
 * The quiz weights are not measured: the eval photos carry no quiz answers.
 *
 * @see openspec/specs/season-classifier/spec.md
 */
import type { SeasonSlug } from "../palettes/seasons.ts";
import type { Traits } from "../sampling/traits.ts";
import type { QuizAnswers } from "./quiz.ts";

const point = (temperature: number, value: number, clarity: number): Traits => ({
  temperature,
  value,
  clarity,
});

/** Symmetric across warm and cool. */
export const REFERENCE_POINTS: Record<SeasonSlug, Traits> = {
  "light-spring": point(0.4, 0.8, 0.2),
  "true-spring": point(0.9, 0.3, 0.4),
  "bright-spring": point(0.4, 0.2, 0.9),
  "light-summer": point(-0.4, 0.8, -0.2),
  "true-summer": point(-0.9, 0.2, -0.3),
  "soft-summer": point(-0.4, 0, -0.8),
  "soft-autumn": point(0.4, 0, -0.8),
  "true-autumn": point(0.9, -0.2, -0.2),
  "deep-autumn": point(0.4, -0.8, 0),
  "deep-winter": point(-0.4, -0.8, 0.2),
  "true-winter": point(-0.9, -0.3, 0.5),
  "bright-winter": point(-0.4, -0.1, 0.9),
};

type Weights = {
  [Q in keyof QuizAnswers]-?: Partial<Record<NonNullable<QuizAnswers[Q]>, Partial<Traits>>>;
};

/** What each answer adds to the quiz's traits. Unsure and neutral answers (mix, both, burn-tan, medium) add nothing. */
export const QUIZ_WEIGHTS: Weights = {
  veins: { green: { temperature: 0.5 }, blue: { temperature: -0.5 } },
  jewelry: { gold: { temperature: 0.5 }, silver: { temperature: -0.5 } },
  sun: { burn: { temperature: -0.2, value: 0.4 }, tan: { temperature: 0.2, value: -0.3 } },
  hair: {
    dark: { value: -0.6, clarity: 0.3 },
    blonde: { value: 0.6 },
    red: { temperature: 0.5, value: 0.1 },
  },
};

/** With a photo, an axis the quiz touched is this share photo, the rest quiz. */
export const PHOTO_SHARE = 0.8;
/** Confidence scale without a photo. */
export const QUIZ_ONLY_CONFIDENCE = 0.6;
/** Photo and quiz `differ` only when both temperatures are at least this far from neutral. */
export const DIFFER_THRESHOLD = 0.15;
