import { withErrorCapture } from "@/lib/observability/with-error-capture";

// ponytail: deliberate probe proving production errors reach Sentry (Phase 0 exit
// check). Delete once it is recorded.
export const GET = withErrorCapture((): never => {
  throw new Error("sentry-check: deliberate Phase 0 probe");
});
