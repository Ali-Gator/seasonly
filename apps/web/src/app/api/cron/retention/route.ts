import { timingSafeEqual } from "node:crypto";

import * as Sentry from "@sentry/nextjs";

import { withErrorCapture } from "@/lib/observability/with-error-capture";
import { runRetention } from "@/lib/retention/retention";

/** Constant-time check of `Bearer <CRON_SECRET>`. An unset or empty secret refuses everything. */
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The daily retention run, called by Vercel Cron (`apps/web/vercel.json`) with the cron secret as
 * its bearer token. A storage or database error is thrown, so Sentry gets it and Next answers 500.
 *
 * {@link openspec/specs/data-retention/spec.md#requirement-the-job-runs-daily-only-for-the-cron-secret}
 */
export const GET = withErrorCapture(async (request: Request) => {
  if (!process.env.CRON_SECRET) {
    // Every run would answer 401 and delete nothing, so say so where someone looks.
    Sentry.captureMessage("CRON_SECRET is not set: the retention job cannot run", "error");
    await Sentry.flush(2000);
  }
  if (!authorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runRetention());
});
