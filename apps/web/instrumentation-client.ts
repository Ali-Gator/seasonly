import * as Sentry from "@sentry/nextjs";

import { initPostHog } from "@/lib/observability/posthog";
import { baseSentryOptions } from "@/lib/observability/sentry";

Sentry.init(baseSentryOptions());
initPostHog();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
