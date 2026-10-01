import * as Sentry from "@sentry/nextjs";

// Forced init: under a Turbopack production build Sentry.init never runs in the
// runtime serving a route unless the route's import graph reaches the config
// (getsentry/sentry-javascript#21713, seen in runtrip-v2).
import "../../../../sentry.server.config";

// ponytail: throws on purpose so Phase 0 can prove production errors reach Sentry.
// Delete once the Phase 0 exit check is recorded.
export function GET(): never {
  const client = Sentry.getClient();
  console.log("sentry-check", {
    client: Boolean(client),
    enabled: client?.getOptions().enabled,
    dsn: Boolean(client?.getDsn()),
  });
  throw new Error("sentry-check: deliberate Phase 0 probe");
}
