import { randomBytes } from "node:crypto";

import type { Agreement, QuizAnswers, SeasonSlug, Traits } from "@seasonly/analysis";
import * as Sentry from "@sentry/nextjs";

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

const TIMEOUT_MS = 3000;

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
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Error>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(new Error("report save timed out after 3 s"));
    }, TIMEOUT_MS);
  });
  const save = (async () => (await insert(row, controller.signal)).error)().catch(
    (error: unknown) => error ?? new Error("report save failed"),
  );
  try {
    const error = await Promise.race([save, timeout]);
    if (!error) return row.id;
    Sentry.captureException(new Error("report save failed", { cause: error }));
    await Sentry.flush(2000);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
