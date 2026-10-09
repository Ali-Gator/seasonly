/**
 * The eval's metrics, from each photo's outcome. Pure: no photos, no files.
 *
 * @see openspec/specs/analysis-eval/spec.md
 */
import {
  type Family,
  type PhotoProblem,
  SEASON_SLUGS,
  seasonFamily,
} from "../packages/analysis/src/index.ts";
import { type EvalPhoto, expectOf, type Season } from "./manifest.ts";

export type Problem = PhotoProblem | "several-faces";
export const PROBLEMS = [
  "no-face",
  "dark",
  "tint",
  "filter",
  "several-faces",
] as const satisfies readonly Problem[];

export interface VariantOutcome {
  name: string;
  expected: PhotoProblem;
  problem: Problem | null;
}

export interface PhotoOutcome {
  photo: EvalPhoto;
  /** Null for a pass. */
  problem: Problem | null;
  /** Set only for a pass. */
  season: Season | null;
  /** Run only for a usable photo that passes. */
  variants: VariantOutcome[];
}

export interface Metrics {
  agreement: number | null;
  familyAgreement: number | null;
  accuracy: number | null;
  familyAccuracy: number | null;
  falseRejectRate: number | null;
  /** Usable photos rejected, by problem. */
  falseRejects: Record<Problem, number>;
  expectedProblemRate: number | null;
  catchRate: number | null;
  passRate: number | null;
}

export interface PersonRow {
  person: string;
  label: Season;
  /** At least two usable photos passed. */
  measured: boolean;
  /** The most frequent season of the passing usable photos. */
  season: Season | null;
  agreement: number | null;
  familyAgreement: number | null;
  photos: PhotoOutcome[];
}

const FAMILIES: readonly Family[] = ["spring", "summer", "autumn", "winter"];

const round = (v: number) => Math.round(v * 10_000) / 10_000;
const share = (hits: number, of: number) => (of ? round(hits / of) : null);
const mean = (values: number[]) =>
  values.length ? round(values.reduce((s, v) => s + v, 0) / values.length) : null;

/** The most frequent value; a tie goes to `label`, then to the earlier one in `order`. */
function mode<T>(values: readonly T[], label: T, order: readonly T[]): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const top = Math.max(...counts.values());
  if (counts.get(label) === top) return label;
  return order.find((v) => counts.get(v) === top) as T;
}

const isUsable = (o: PhotoOutcome) => expectOf(o.photo) === "pass";

export function metricsOf(outcomes: readonly PhotoOutcome[]): {
  metrics: Metrics;
  people: PersonRow[];
} {
  const usable = outcomes.filter(isUsable);
  const passing = usable.filter((o) => o.season);
  const others = outcomes.filter((o) => !isUsable(o));
  const variants = passing.flatMap((o) => o.variants);

  const people: PersonRow[] = [...new Set(outcomes.map((o) => o.photo.person))].map((person) => {
    const photos = outcomes.filter((o) => o.photo.person === person);
    const label = (photos[0] as PhotoOutcome).photo.season;
    const seasons = passing.filter((o) => o.photo.person === person).map((o) => o.season as Season);
    if (seasons.length < 2)
      return {
        person,
        label,
        measured: false,
        season: null,
        agreement: null,
        familyAgreement: null,
        photos,
      };
    const season = mode(seasons, label, SEASON_SLUGS);
    const families = seasons.map(seasonFamily);
    const family = mode(families, seasonFamily(label), FAMILIES);
    return {
      person,
      label,
      measured: true,
      season,
      agreement: share(seasons.filter((s) => s === season).length, seasons.length),
      familyAgreement: share(families.filter((f) => f === family).length, families.length),
      photos,
    };
  });
  const measured = people.filter((p) => p.measured);

  const falseRejects = Object.fromEntries(PROBLEMS.map((p) => [p, 0])) as Record<Problem, number>;
  for (const o of usable) if (o.problem) falseRejects[o.problem]++;

  return {
    metrics: {
      agreement: mean(measured.map((p) => p.agreement as number)),
      familyAgreement: mean(measured.map((p) => p.familyAgreement as number)),
      accuracy: share(passing.filter((o) => o.season === o.photo.season).length, usable.length),
      familyAccuracy: share(
        passing.filter((o) => seasonFamily(o.season as Season) === seasonFamily(o.photo.season))
          .length,
        usable.length,
      ),
      falseRejectRate: share(usable.length - passing.length, usable.length),
      falseRejects,
      expectedProblemRate: share(
        others.filter((o) => o.problem === expectOf(o.photo)).length,
        others.length,
      ),
      catchRate: share(variants.filter((v) => v.problem === v.expected).length, variants.length),
      passRate: share(outcomes.filter((o) => !o.problem).length, outcomes.length),
    },
    people,
  };
}
