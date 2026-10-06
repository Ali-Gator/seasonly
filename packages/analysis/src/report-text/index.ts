/**
 * The report's fixed words: each season's copy and a note for each photo/quiz agreement case.
 * The web app's vision call writes a personal summary and note body in their place when it can.
 *
 * @see openspec/specs/report-text/spec.md
 */
export { AGREEMENT_COPY, SEASON_COPY } from "./copy.ts";

export interface SeasonCopy {
  tagline: string;
  summary: string;
  undertone: string;
  chroma: string;
  contrast: string;
  neutralsIntro: string;
  metalsIntro: string;
  makeupIntro: string;
  hairTip: string;
  /** Names the season's own draping pair. */
  drapingLine: string;
  /** Shown on the reveal: what suits the family's colors, never naming the season. */
  revealLine: string;
}

export interface AgreementCopy {
  title: string;
  /** Shown when there is no personal note. */
  body: string;
}

/** Maximum length in characters, so the report layout holds. */
export const COPY_LIMITS: { [K in keyof SeasonCopy | "noteTitle" | "noteBody"]: number } = {
  tagline: 60,
  summary: 600,
  undertone: 40,
  chroma: 40,
  contrast: 40,
  neutralsIntro: 160,
  metalsIntro: 160,
  makeupIntro: 160,
  hairTip: 160,
  drapingLine: 120,
  revealLine: 160,
  noteTitle: 40,
  noteBody: 240,
};
