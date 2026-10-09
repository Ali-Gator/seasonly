import { withTimeout } from "@/lib/observability/with-timeout";
import { supabase } from "@/lib/supabase";

/**
 * Interest in `public.interest_clicks`, one row per report: a repeat tap inserts nothing and still
 * succeeds. The latest address comes back with it, for the clicked note.
 *
 * {@link openspec/specs/interest-button/spec.md#requirement-a-tap-records-one-interest-per-report}
 */
export type InterestOutcome =
  { kind: "recorded"; email: string | null } | { kind: "unknown" } | { kind: "failed" };

export interface InterestStore {
  insert: (
    row: { report_id: string; is_test: boolean },
    signal: AbortSignal,
  ) => PromiseLike<{ error: { code?: string } | null }>;
  latestEmail: (
    reportId: string,
    signal: AbortSignal,
  ) => PromiseLike<{ data: { email: string }[] | null; error: unknown }>;
}

const supabaseStore: InterestStore = {
  insert: (row, signal) =>
    supabase()
      .from("interest_clicks")
      .upsert(row, { onConflict: "report_id", ignoreDuplicates: true })
      .abortSignal(signal),
  latestEmail: (reportId, signal) =>
    supabase()
      .from("report_emails")
      .select("email")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .abortSignal(signal),
};

/**
 * Never throws: a failed or hanging store (3 s) gives `failed` and is reported to Sentry. An
 * unknown report is a foreign-key violation, answered without a report.
 *
 * {@link openspec/specs/interest-button/spec.md#requirement-a-failed-tap-can-be-repeated}
 */
export async function recordInterest(
  reportId: string,
  store: InterestStore = supabaseStore,
): Promise<InterestOutcome> {
  const result = await withTimeout(
    "interest store failed",
    async (signal): Promise<InterestOutcome> => {
      const { error } = await store.insert(
        { report_id: reportId, is_test: process.env.VERCEL_ENV !== "production" },
        signal,
      );
      if (error?.code === "23503") return { kind: "unknown" };
      if (error) throw new Error(`interest insert failed (${error.code ?? "no code"})`);
      const latest = await store.latestEmail(reportId, signal);
      if (latest.error) throw latest.error;
      return { kind: "recorded", email: latest.data?.[0]?.email ?? null };
    },
    { extra: { reportId } },
  );
  return result.ok ? result.value : { kind: "failed" };
}
