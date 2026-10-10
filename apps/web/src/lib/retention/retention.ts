import { supabase } from "@/lib/supabase";

/**
 * The daily retention job: face crops older than 24 hours, then `is_test` reports older than 24
 * hours (their addresses and interest go with them by cascade). Real reports are kept until the
 * person asks.
 *
 * @see openspec/specs/data-retention/spec.md
 */
export type CropEntry = { name: string; id: string | null; created_at: string | null };
/** The oldest crops at the bucket root, at most {@link PAGE}, oldest first. */
export type ListCrops = () => PromiseLike<{ data: CropEntry[] | null; error: unknown }>;
export type RemoveCrops = (
  names: string[],
) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
export type DeleteTestReports = (
  cutoff: string,
) => PromiseLike<{ count: number | null; error: unknown }>;

export const PAGE = 100;
const BUCKET = "crops";
const DAY = 24 * 3_600_000;

const supabaseList: ListCrops = () =>
  supabase()
    .storage.from(BUCKET)
    .list("", { limit: PAGE, sortBy: { column: "created_at", order: "asc" } });
const supabaseRemove: RemoveCrops = (names) => supabase().storage.from(BUCKET).remove(names);
const supabaseDeleteTestReports: DeleteTestReports = (cutoff) =>
  supabase()
    .from("reports")
    .delete({ count: "exact" })
    .eq("is_test", true)
    .lt("created_at", cutoff);

/**
 * Deletes every crop created before `cutoff` and answers how many. Each pass lists from the start
 * again, since the removed names are gone; paging by offset across deletions would skip objects.
 * A remove may delete fewer than asked when a crop is already gone (an overlapping run, a deletion
 * by hand); a crop that lists again after its remove is stuck and throws, so the loop never spins.
 *
 * {@link openspec/specs/data-retention/spec.md#requirement-the-job-deletes-face-crops-older-than-24-hours}
 */
export async function deleteOldCrops(
  cutoff: Date,
  { list = supabaseList, remove = supabaseRemove }: { list?: ListCrops; remove?: RemoveCrops } = {},
): Promise<number> {
  let deleted = 0;
  let asked = new Set<string>();
  for (;;) {
    const { data, error } = await list();
    if (error || !data) throw error ?? new Error("crop listing gave no data");
    // Folder placeholders have no id or date.
    const old = data
      .filter((o) => o.id && o.created_at && new Date(o.created_at) < cutoff)
      .map((o) => o.name);
    if (old.length === 0) return deleted;
    const stuck = old.filter((name) => asked.has(name));
    if (stuck.length > 0) {
      throw new Error(`crop remove left ${stuck.length} behind, such as ${stuck[0]}`);
    }
    asked = new Set(old);
    const removed = await remove(old);
    if (removed.error || !removed.data) {
      throw removed.error ?? new Error("crop remove gave no data");
    }
    deleted += removed.data.length;
  }
}

/**
 * One run against a cutoff of exactly 24 hours. Crops go first: a storage error stops the run
 * before the database step, and the next run retries both.
 *
 * {@link openspec/specs/data-retention/spec.md#requirement-the-job-runs-daily-only-for-the-cron-secret}
 */
export async function runRetention({
  now = new Date(),
  list,
  remove,
  deleteTestReports = supabaseDeleteTestReports,
}: {
  now?: Date;
  list?: ListCrops;
  remove?: RemoveCrops;
  deleteTestReports?: DeleteTestReports;
} = {}): Promise<{ crops: number; testReports: number }> {
  const cutoff = new Date(now.getTime() - DAY);
  const crops = await deleteOldCrops(cutoff, { list, remove });
  const { count, error } = await deleteTestReports(cutoff.toISOString());
  if (error) throw error;
  return { crops, testReports: count ?? 0 };
}
