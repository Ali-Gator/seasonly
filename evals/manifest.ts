/**
 * The labeled photo set. Photos live in `evals/photos/` (git-ignored); this manifest
 * is committed. Phase 1 (t6-eval-set) fills it and adds the consistency runner.
 */
export const SEASONS = [
  "light-spring",
  "warm-spring",
  "clear-spring",
  "light-summer",
  "cool-summer",
  "soft-summer",
  "soft-autumn",
  "warm-autumn",
  "deep-autumn",
  "deep-winter",
  "cool-winter",
  "clear-winter",
] as const;

export type Season = (typeof SEASONS)[number];

export type EvalPhoto = {
  /** Path under evals/photos/, e.g. `p01/daylight-1.jpg`. */
  file: string;
  /** Stable person ID; agreement is measured across one person's photos. */
  person: string;
  /** The season you labeled for this person. */
  season: Season;
  /** Free-text light condition, e.g. `daylight`, `indoor-warm`. */
  light: string;
};

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
    if (!SEASONS.includes(p?.season as Season))
      problems.push(`${at}.season: not one of the 12 seasons`);
    if (typeof p?.light !== "string" || !p.light) problems.push(`${at}.light: required`);
    const prior = seasonOf.get(p?.person);
    if (prior && prior !== p.season)
      problems.push(`${at}: ${p.person} labeled both ${prior} and ${p.season}`);
    if (p?.person) seasonOf.set(p.person, p.season);
  });
  return problems;
}
