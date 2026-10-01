import * as Sentry from "@sentry/nextjs";

// Forced init: under a Turbopack production build Sentry.init never runs in the
// runtime serving a route unless the route's import graph reaches the config
// (getsentry/sentry-javascript#21713). Every route imports this module, so this
// one import covers them all.
import "../../../sentry.server.config";

/**
 * Wraps a route handler so an unhandled error reaches Sentry before the function
 * freezes, then rethrows it. Next's `onRequestError` hook does not fire for route
 * handlers in a Vercel production build, so the hook alone loses every server error.
 *
 * {@link openspec/specs/observability/spec.md#requirement-every-route-handler-reports-its-unhandled-errors}
 */
export function withErrorCapture<Args extends unknown[], R>(
  handler: (...args: Args) => R | Promise<R>,
): (...args: Args) => Promise<R> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      Sentry.captureException(error);
      await Sentry.flush(2000);
      throw error;
    }
  };
}
