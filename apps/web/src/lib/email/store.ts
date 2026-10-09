import type { SeasonSlug } from "@seasonly/analysis";

import { withTimeout } from "@/lib/observability/with-timeout";
import { supabase } from "@/lib/supabase";

/**
 * Addresses in `public.report_emails`, stored only through `store_report_email`, which counts and
 * inserts in one step.
 *
 * {@link openspec/specs/email-capture/spec.md#requirement-sending-the-form-stores-the-address-and-opens-the-report}
 */
export type StoreOutcome =
  | { kind: "stored"; emailId: number; season: SeasonSlug; quizOnly: boolean }
  | { kind: "limit" }
  | { kind: "unknown" }
  | { kind: "failed" };

export type StoreEmailRpc = (
  args: { p_report_id: string; p_email: string; p_is_test: boolean },
  signal: AbortSignal,
) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;

interface Row {
  outcome: "stored" | "limit" | "unknown";
  email_id: number | null;
  season: SeasonSlug | null;
  agreement: string | null;
}

const supabaseRpc: StoreEmailRpc = (args, signal) =>
  supabase().rpc("store_report_email", args).abortSignal(signal);

/**
 * Stores an address under its report. Never throws: a failed or hanging store (3 s) gives
 * `failed` and is reported to Sentry with the report id and the error code only, since a
 * database error's details can hold the row, address included.
 */
export async function storeReportEmail(
  reportId: string,
  email: string,
  { rpc = supabaseRpc }: { rpc?: StoreEmailRpc } = {},
): Promise<StoreOutcome> {
  const result = await withTimeout(
    "report email store failed",
    async (signal) => {
      const { data, error } = await rpc(
        {
          p_report_id: reportId,
          p_email: email,
          p_is_test: process.env.VERCEL_ENV !== "production",
        },
        signal,
      );
      if (error) throw new Error(`store_report_email failed (${error.code ?? "no code"})`);
      const row = (data as Row[] | null)?.[0];
      if (!row) throw new Error("store_report_email gave no row");
      return row;
    },
    { extra: { reportId } },
  );
  if (!result.ok) return { kind: "failed" };
  const row = result.value;
  if (row.outcome === "stored" && row.email_id !== null && row.season)
    return {
      kind: "stored",
      emailId: Number(row.email_id),
      season: row.season,
      quizOnly: row.agreement === "quiz-only",
    };
  return { kind: row.outcome === "stored" ? "failed" : row.outcome };
}
