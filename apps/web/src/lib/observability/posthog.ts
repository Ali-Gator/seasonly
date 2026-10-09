import posthog from "posthog-js";

import { maskReportIds } from "@/lib/analytics";

/**
 * Starts PostHog in the browser. A missing key leaves it off. Every event passes the report-id
 * mask on its way out.
 *
 * {@link openspec/specs/observability/spec.md#requirement-observability-is-off-until-its-keys-are-set}
 * {@link openspec/specs/analytics/spec.md#requirement-no-report-id-reaches-posthog}
 */
export function initPostHog(): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2025-05-24",
    before_send: maskReportIds,
    // The flags request sends the first page's URL as a person property, outside before_send:
    // the report id of a visitor who arrives by the email link. Nothing reads a flag yet.
    // ponytail: off until t7-paywall-off needs a flag and masks that URL first.
    advanced_disable_flags: true,
  });
  return true;
}
