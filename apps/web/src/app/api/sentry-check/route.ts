import * as Sentry from "@sentry/nextjs";

// Forced init: under a Turbopack production build Sentry.init never runs in the
// runtime serving a route unless the route's import graph reaches the config
// (getsentry/sentry-javascript#21713, seen in runtrip-v2).
import "../../../../sentry.server.config";

// ponytail: deliberate Phase 0 probe — proves server events reach Sentry.
// Delete once the Phase 0 exit check is recorded.
export async function GET(request: Request): Promise<Response> {
  const client = Sentry.getClient();
  const error = new Error("sentry-check: deliberate Phase 0 probe");
  if (new URL(request.url).searchParams.has("explicit")) {
    const eventId = Sentry.captureException(error);
    const flushed = await Sentry.flush(5000);
    console.log("sentry-check explicit", { eventId, flushed });
    return new Response("captured", { status: 500 });
  }
  console.log("sentry-check", { client: Boolean(client), enabled: client?.getOptions().enabled });
  throw error;
}
