import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";

import { BOTID_PROTECT } from "@/lib/abuse/botid";
import { initPostHog } from "@/lib/observability/posthog";
import { baseSentryOptions } from "@/lib/observability/sentry";

Sentry.init(baseSentryOptions());
initPostHog();
initBotId({ protect: BOTID_PROTECT });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
