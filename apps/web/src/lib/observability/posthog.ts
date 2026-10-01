import posthog from "posthog-js";

/**
 * Starts PostHog in the browser. A missing key leaves it off.
 *
 * {@link openspec/specs/observability/spec.md#requirement-observability-is-off-until-its-keys-are-set}
 */
export function initPostHog(): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    defaults: "2025-05-24",
  });
  return true;
}
