/**
 * Season classifier: photo traits, quiz answers or both → the nearest season's reference point.
 *
 * @see openspec/specs/season-classifier/spec.md
 */
import { SEASON_SLUGS, type SeasonSlug } from "../palettes/seasons.ts";
import type { Traits } from "../sampling/traits.ts";
import type { QuizAnswers } from "./quiz.ts";
import {
  DIFFER_THRESHOLD,
  PHOTO_SHARE,
  QUIZ_ONLY_CONFIDENCE,
  QUIZ_WEIGHTS,
  REFERENCE_POINTS,
} from "./reference.ts";

export { QUIZ_VALUES, QuizAnswersSchema, type QuizAnswers } from "./quiz.ts";
export { QUIZ_WEIGHTS, REFERENCE_POINTS } from "./reference.ts";

export type Agreement = "agree" | "differ" | "photo-only" | "quiz-only";

export interface SeasonResult {
  season: SeasonSlug;
  runnerUp: SeasonSlug;
  /** 0 to 1, two decimals: 1 on a reference point, 0 midway between the two nearest. */
  confidence: number;
  agreement: Agreement;
  /** The traits classified: the photo's, moved by the quiz where it answered. */
  traits: Traits;
}

export interface ClassifyInput {
  photo?: Traits | null;
  answers?: QuizAnswers;
}

const AXES = ["temperature", "value", "clarity"] as const;
type Axis = (typeof AXES)[number];

const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places || 0;
const clamp = (v: number) => Math.min(1, Math.max(-1, v));

/** The answers' traits, and the axes at least one answer moved. */
function quizTraits(answers: QuizAnswers): { traits: Traits; touched: Set<Axis> } {
  const traits: Traits = { temperature: 0, value: 0, clarity: 0 };
  const touched = new Set<Axis>();
  for (const question of Object.keys(QUIZ_WEIGHTS) as (keyof QuizAnswers)[]) {
    const answer = answers[question];
    const weights = answer && (QUIZ_WEIGHTS[question] as Record<string, Partial<Traits>>)[answer];
    for (const axis of AXES) {
      const w = weights?.[axis];
      if (w === undefined) continue;
      traits[axis] += w;
      touched.add(axis);
    }
  }
  for (const axis of AXES) traits[axis] = round(clamp(traits[axis]), 3);
  return { traits, touched };
}

/** Null when there is no photo and no answer that moves any trait. */
export function classify({ photo = null, answers = {} }: ClassifyInput): SeasonResult | null {
  const quiz = quizTraits(answers);
  if (!photo && quiz.touched.size === 0) return null;

  const mix = (axis: Axis, p: Traits) =>
    quiz.touched.has(axis)
      ? round(PHOTO_SHARE * p[axis] + (1 - PHOTO_SHARE) * quiz.traits[axis], 3)
      : p[axis];
  const traits: Traits = photo
    ? {
        temperature: mix("temperature", photo),
        value: mix("value", photo),
        clarity: mix("clarity", photo),
      }
    : quiz.traits;

  // Squared distances, nearest first; a tie goes to the earlier season.
  const ranked = SEASON_SLUGS.map((slug, i) => {
    const p = REFERENCE_POINTS[slug];
    const d2 = AXES.reduce((s, axis) => s + (traits[axis] - p[axis]) ** 2, 0);
    return { slug, i, d2 };
  }).sort((a, b) => a.d2 - b.d2 || a.i - b.i);
  const [first, second] = ranked as [(typeof ranked)[number], (typeof ranked)[number]];

  const scale = photo ? 1 : QUIZ_ONLY_CONFIDENCE;
  const confidence = round(scale * (1 - Math.sqrt(first.d2) / Math.sqrt(second.d2)), 2);

  const opposed =
    Math.sign(photo?.temperature ?? 0) * Math.sign(quiz.traits.temperature) < 0 &&
    Math.abs(photo?.temperature ?? 0) >= DIFFER_THRESHOLD &&
    Math.abs(quiz.traits.temperature) >= DIFFER_THRESHOLD;
  const agreement: Agreement = !photo
    ? "quiz-only"
    : quiz.touched.size === 0
      ? "photo-only"
      : opposed
        ? "differ"
        : "agree";

  return { season: first.slug, runnerUp: second.slug, confidence, agreement, traits };
}
