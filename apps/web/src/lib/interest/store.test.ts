import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type InterestStore, recordInterest } from "./record";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const store = (over: Partial<InterestStore> = {}): InterestStore => ({
  insert: vi.fn(async () => ({ error: null })),
  latestEmail: vi.fn(async () => ({ data: [{ email: "maya.reyes@gmail.com" }], error: null })),
  ...over,
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("recordInterest", () => {
  /** {@link openspec/specs/interest-button/spec.md#scenario-the-first-tap} */
  it("records interest as test data off production and gives the latest address", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const s = store();
    expect(await recordInterest(ID, s)).toEqual({
      kind: "recorded",
      email: "maya.reyes@gmail.com",
    });
    expect(s.insert).toHaveBeenCalledWith(
      { report_id: ID, is_test: true },
      expect.any(AbortSignal),
    );
    vi.stubEnv("VERCEL_ENV", "production");
    await recordInterest(ID, s);
    expect(vi.mocked(s.insert).mock.calls[1]?.[0]).toEqual({ report_id: ID, is_test: false });
  });

  /** {@link openspec/specs/interest-button/spec.md#requirement-the-clicked-state-names-where-the-news-will-go} */
  it("gives a null address when none is stored", async () => {
    expect(
      await recordInterest(ID, store({ latestEmail: async () => ({ data: [], error: null }) })),
    ).toEqual({ kind: "recorded", email: null });
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-an-unknown-id} */
  it("gives unknown for a foreign-key violation, reporting nothing", async () => {
    expect(
      await recordInterest(ID, store({ insert: async () => ({ error: { code: "23503" } }) })),
    ).toEqual({ kind: "unknown" });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-the-database-is-down} */
  it("gives failed and reports to Sentry on an error or after 3 s", async () => {
    expect(
      await recordInterest(ID, store({ insert: async () => ({ error: { code: "XX000" } }) })),
    ).toEqual({ kind: "failed" });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    const pending = recordInterest(ID, store({ insert: () => new Promise(() => {}) }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(await pending).toEqual({ kind: "failed" });
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
  });
});
