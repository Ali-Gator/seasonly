import { httpIntegration } from "@sentry/nextjs";

/**
 * Server-only Sentry options. Our Http integration replaces Next's own, so it repeats
 * `disableIncomingRequestSpans` — Next.js records request spans itself — and turns off body
 * capture, which would send up to 10 KB of every request, face crop included. The function form
 * keeps `httpIntegration` out of module load: `Sentry.init` calls it with Next's defaults and
 * uses the result as the final list.
 *
 * {@link openspec/specs/observability/spec.md#requirement-error-reports-carry-no-request-body}
 */
export function serverSentryOptions() {
  return {
    integrations: <T extends { name: string }>(defaults: T[]) => [
      ...defaults.filter((i) => i.name !== "Http"),
      httpIntegration({ disableIncomingRequestSpans: true, maxIncomingRequestBodySize: "none" }),
    ],
  };
}
