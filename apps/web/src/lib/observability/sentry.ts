/**
 * Shared Sentry options for every runtime.
 *
 * {@link openspec/specs/observability/spec.md#requirement-observability-is-off-until-its-keys-are-set}
 */
export function baseSentryOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_VERCEL_ENV,
    tracesSampleRate: 0.1,
  };
}
