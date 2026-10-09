/**
 * The labeled photo set. Photos live in `evals/photos/` (git-ignored); this manifest
 * is committed, with where each photo comes from, so `pnpm eval:fetch` can rebuild the set.
 *
 * @see openspec/specs/analysis-eval/spec.md
 */
import { SEASON_SLUGS, type SeasonSlug } from "../packages/analysis/src/index.ts";

export type Season = SeasonSlug;

/** The check outcome a photo should get. */
export const EXPECTS = ["pass", "no-face", "dark", "tint", "filter", "several-faces"] as const;
export type Expect = (typeof EXPECTS)[number];

export type EvalPhoto = {
  /** Path under evals/photos/, e.g. `p01/daylight-1.jpg`. */
  file: string;
  /** Stable person ID; agreement is measured across one person's photos. */
  person: string;
  /** The season you labeled for this person. */
  season: Season;
  /** Free-text light condition, e.g. `daylight`, `indoor-warm`. */
  light: string;
  /** An https URL the photo is downloaded from; needs `sha256` and `license`. */
  source?: string;
  /** Of the downloaded bytes. */
  sha256?: string;
  license?: string;
  author?: string;
  /** Absent: `pass`. */
  expect?: Expect;
};

export const expectOf = (photo: EvalPhoto): Expect => photo.expect ?? "pass";

export type Manifest = { version: 1; photos: EvalPhoto[] };

/** Every problem in a parsed manifest, empty when it is valid. */
export function manifestProblems(value: unknown): string[] {
  const m = value as Partial<Manifest> | null;
  if (!m || m.version !== 1 || !Array.isArray(m.photos))
    return ["expected { version: 1, photos: [] }"];
  const problems: string[] = [];
  const seasonOf = new Map<string, string>();
  const files = new Set<string>();
  m.photos.forEach((p, i) => {
    const at = `photos[${i}]`;
    if (typeof p?.file !== "string" || !/^[\w-]+\/[\w.-]+\.(jpe?g|png|webp|heic)$/i.test(p.file)) {
      problems.push(`${at}.file: expected <person>/<name>.<jpg|png|webp|heic>`);
    } else if (files.has(p.file)) {
      problems.push(`${at}.file: duplicate ${p.file}`);
    } else {
      files.add(p.file);
    }
    if (typeof p?.person !== "string" || !p.person) problems.push(`${at}.person: required`);
    if (!SEASON_SLUGS.includes(p?.season as Season))
      problems.push(`${at}.season: not one of the 12 seasons`);
    if (typeof p?.light !== "string" || !p.light) problems.push(`${at}.light: required`);
    if (p?.source !== undefined && !/^https:\/\/\S+$/.test(String(p.source)))
      problems.push(`${at}.source: expected an https URL`);
    if (p?.sha256 !== undefined && !/^[0-9a-f]{64}$/.test(String(p.sha256)))
      problems.push(`${at}.sha256: expected 64 lowercase hex digits`);
    for (const key of ["license", "author"] as const)
      if (p?.[key] !== undefined && (typeof p[key] !== "string" || !p[key]))
        problems.push(`${at}.${key}: expected a non-empty string`);
    if (p?.source !== undefined) {
      if (p.sha256 === undefined) problems.push(`${at}.sha256: required with a source`);
      if (p.license === undefined) problems.push(`${at}.license: required with a source`);
    }
    if (p?.expect !== undefined && !EXPECTS.includes(p.expect))
      problems.push(`${at}.expect: not one of ${EXPECTS.join(", ")}`);
    const prior = seasonOf.get(p?.person);
    if (prior && prior !== p.season)
      problems.push(`${at}: ${p.person} labeled both ${prior} and ${p.season}`);
    if (p?.person) seasonOf.set(p.person, p.season);
  });
  return problems;
}
