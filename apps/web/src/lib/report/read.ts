// Forced init, as in with-error-capture.ts: the page is not a route handler, so nothing else on
// its import graph is sure to reach the server config under a Turbopack production build.
import "../../../sentry.server.config";

import type { Agreement, SeasonSlug } from "@seasonly/analysis";

import type { TextSource } from "@/lib/analysis/store";
import { withTimeout } from "@/lib/observability/with-timeout";
import { supabase } from "@/lib/supabase";

/**
 * One stored report as the page shows it, from one select that embeds its latest address and
 * its interest record.
 *
 * {@link openspec/specs/report-page/spec.md#requirement-a-stored-report-renders-the-canvas-report}
 */
export interface StoredReport {
  season: SeasonSlug;
  agreement: Agreement;
  textSource: TextSource;
  /** Personal text only. */
  summary: string | null;
  agreementNote: string | null;
  /** The address most recently given for the report. */
  email: string | null;
  interested: boolean;
}

interface Row {
  season: SeasonSlug;
  agreement: Agreement;
  text_source: TextSource;
  summary: string | null;
  agreement_note: string | null;
  report_emails: { email: string }[] | null;
  /** One-to-one, so PostgREST embeds an object; a list is read the same way. */
  interest_clicks: { report_id: string } | { report_id: string }[] | null;
}

export type ReportSelect = (
  id: string,
  signal: AbortSignal,
) => PromiseLike<{ data: unknown; error: unknown }>;

const supabaseSelect: ReportSelect = (id, signal) =>
  supabase()
    .from("reports")
    .select(
      "season, agreement, text_source, summary, agreement_note, report_emails(email, created_at), interest_clicks(report_id)",
    )
    .eq("id", id)
    .order("created_at", { referencedTable: "report_emails", ascending: false })
    .limit(1, { referencedTable: "report_emails" })
    .abortSignal(signal)
    .maybeSingle();

/**
 * The report, or null when there is none. A database error or no answer within 3 s is reported
 * to Sentry, flushed, then thrown, so the page answers its error page with a 500 without relying
 * on the framework's request-error hook.
 *
 * {@link openspec/specs/report-page/spec.md#requirement-a-failed-read-is-an-error-reported-to-sentry}
 */
export async function readReport(
  id: string,
  { select = supabaseSelect }: { select?: ReportSelect } = {},
): Promise<StoredReport | null> {
  // THROWAWAY (task 6.3 step 7): a forced read failure for one test report. Reverted next commit.
  if (id === "V-kYLkoMe9pEnkRAify84A")
    select = async () => ({ data: null, error: new Error("forced read failure (task 6.3)") });
  const read = await withTimeout(
    "report read failed",
    async (signal) => {
      const { data, error } = await select(id, signal);
      if (error) throw error;
      return data as Row | null;
    },
    { extra: { reportId: id } },
  );
  if (!read.ok) throw new Error("report read failed");
  const row = read.value;
  if (!row) return null;
  const interest = row.interest_clicks;
  return {
    season: row.season,
    agreement: row.agreement,
    textSource: row.text_source,
    summary: row.summary,
    agreementNote: row.agreement_note,
    email: row.report_emails?.[0]?.email ?? null,
    interested: Array.isArray(interest) ? interest.length > 0 : Boolean(interest),
  };
}
