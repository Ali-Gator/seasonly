import posthog from "posthog-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { initPostHog } from "./posthog";
import { baseSentryOptions } from "./sentry";

vi.mock("posthog-js", () => ({ default: { init: vi.fn() } }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(posthog.init).mockClear();
});

describe("observability without keys", () => {
  /** {@link openspec/specs/observability/spec.md#scenario-no-sentry-dsn} */
  it("disables Sentry when the DSN is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    expect(baseSentryOptions().enabled).toBe(false);
  });

  /** {@link openspec/specs/observability/spec.md#scenario-no-posthog-key} */
  it("leaves PostHog off when the key is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    expect(initPostHog()).toBe(false);
    expect(posthog.init).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/observability/spec.md#scenario-keys-are-set} */
  it("turns both on when their keys are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://abc@o1.ingest.us.sentry.io/1");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    expect(baseSentryOptions()).toMatchObject({
      enabled: true,
      dsn: "https://abc@o1.ingest.us.sentry.io/1",
    });
    expect(initPostHog()).toBe(true);
    expect(posthog.init).toHaveBeenCalledWith("phc_test", expect.any(Object));
  });
});
