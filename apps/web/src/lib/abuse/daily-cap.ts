import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The daily cap on vision calls: a slot is claimed in Postgres before each call.
 *
 * {@link openspec/specs/abuse-controls/spec.md#requirement-vision-calls-are-capped-per-utc-day}
 */
export type SlotClaim = "granted" | "capped" | "unavailable";

/** One `claim_analysis_slot` request: `data` is true when granted, null when capped. */
export type ClaimRpc = (
  cap: number,
  signal: AbortSignal,
) => PromiseLike<{ data: unknown; error: unknown }>;

const DEFAULT_CAP = 200;
/** A hanging database must not break the analysis flow's 30 s budget. */
const TIMEOUT_MS = 3000;

/** {@link openspec/specs/abuse-controls/spec.md#requirement-the-cap-defaults-to-200-a-day} */
export function dailyCap(): number {
  const value = process.env.DAILY_ANALYSIS_CAP ?? "";
  return /^[1-9]\d*$/.test(value) ? Number(value) : DEFAULT_CAP;
}

let client: SupabaseClient | undefined;

const supabaseRpc: ClaimRpc = (cap, signal) => {
  client ??= createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "", {
    auth: { persistSession: false },
  });
  return client.rpc("claim_analysis_slot", { cap }).abortSignal(signal);
};

/**
 * Claims one of today's slots. Never throws: a missing env var, a network or RPC error, or no
 * answer within 3 s gives `unavailable`.
 *
 * {@link openspec/specs/abuse-controls/spec.md#requirement-an-unreachable-counter-grants-nothing}
 */
export async function claimAnalysisSlot({
  cap = dailyCap(),
  rpc = supabaseRpc,
}: { cap?: number; rpc?: ClaimRpc } = {}): Promise<SlotClaim> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Raced as well as passed on, so a request that ignores the signal still gives way.
  const timeout = new Promise<"unavailable">((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve("unavailable");
    }, TIMEOUT_MS);
  });
  const claim = (async (): Promise<SlotClaim> => {
    const { data, error } = await rpc(cap, controller.signal);
    if (error) return "unavailable";
    return data === true ? "granted" : "capped";
  })().catch(() => "unavailable" as const);
  try {
    return await Promise.race([claim, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
