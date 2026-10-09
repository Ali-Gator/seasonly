import { randomBytes } from "node:crypto";

import type { Agreement, QuizAnswers, SeasonSlug, Traits } from "@seasonly/analysis";
import { withTimeout } from "@/lib/observability/with-timeout";
import type { FallbackReason, PhotoVerdict } from "@/lib/report-text";
import { supabase } from "@/lib/supabase";

/**
 * Season results in `public.reports`, under an unguessable id the report link carries.
 *
 * {@link openspec/specs/season-reveal/spec.md#requirement-a-result-is-stored-under-an-unguessable-id}
 */
export type TextSource = "personal" | FallbackReason | "quiz-only";

export interface ReportRecord {
  season: SeasonSlug;
  runnerUp: SeasonSlug;
  confidence: number;
  agreement: Agreement;
  traits: Traits;
  answers: QuizAnswers;
  /** Null when no model call judged the photo: quiz-only or a fallback. */
  photoVerdict: PhotoVerdict | null;
  textSource: TextSource;
  /** Personal text only. */
  summary: string | null;
  agreementNote: string | null;
}

export interface ReportRow {
  id: string;
  season: SeasonSlug;
  runner_up: SeasonSlug;
  confidence: number;
  agreement: Agreement;
  traits: Traits;
  answers: QuizAnswers;
  photo_verdict: PhotoVerdict | null;
  text_source: TextSource;
  summary: string | null;
  agreement_note: string | null;
  is_test: boolean;
}

export type ReportInsert = (row: ReportRow, signal: AbortSignal) => PromiseLike<{ error: unknown }>;

const supabaseInsert: ReportInsert = (row, signal) =>
  supabase().from("reports").insert(row).abortSignal(signal);

/**
 * Stores a result and gives its id. Never throws: a failed or hanging save (3 s) gives null and
 * is reported to Sentry, so the reveal still shows.
 *
 * {@link openspec/specs/season-reveal/spec.md#requirement-a-failed-save-never-blocks-the-reveal}
 */
export async function saveReport(
  record: ReportRecord,
  { insert = supabaseInsert }: { insert?: ReportInsert } = {},
): Promise<string | null> {
  const row: ReportRow = {
    id: randomBytes(16).toString("base64url"),
    season: record.season,
    runner_up: record.runnerUp,
    confidence: record.confidence,
    agreement: record.agreement,
    traits: record.traits,
    answers: record.answers,
    photo_verdict: record.photoVerdict,
    text_source: record.textSource,
    summary: record.summary,
    agreement_note: record.agreementNote,
    is_test: process.env.VERCEL_ENV !== "production",
  };
  const saved = await withTimeout("report save failed", async (signal) => {
    const { error } = await insert(row, signal);
    if (error) throw error;
  });
  return saved.ok ? row.id : null;
}
