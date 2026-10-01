import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions } from "@/lib/observability/sentry";

/**
 * Sends events with plain `fetch`. Under Turbopack production builds the default Node
 * transport drops server events silently (getsentry/sentry-javascript#18871, seen in
 * runtrip-v2). Drop this once the issue closes and a production probe still arrives.
 */
function makeFetchTransport(options: Parameters<typeof Sentry.makeNodeTransport>[0]) {
  return Sentry.createTransport(options, async (request) => {
    const response = await fetch(options.url, {
      method: "POST",
      body: request.body as BodyInit,
      headers: options.headers,
      cache: "no-store",
    });
    return {
      statusCode: response.status,
      headers: {
        "x-sentry-rate-limits": response.headers.get("X-Sentry-Rate-Limits"),
        "retry-after": response.headers.get("Retry-After"),
      },
    };
  });
}

Sentry.init({ ...baseSentryOptions(), transport: makeFetchTransport });
