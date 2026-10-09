/**
 * The one timeout-and-report helper every Supabase call goes through (BL-01).
 *
 * {@link openspec/specs/email-capture/spec.md#requirement-a-failed-store-keeps-the-person-on-the-step}
 * {@link openspec/specs/report-page/spec.md#requirement-a-failed-read-is-an-error-reported-to-sentry}
 */
import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { withTimeout } from "./with-timeout";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const captured = () => {
  const [error, hint] = vi.mocked(Sentry.captureException).mock.calls[0] ?? [];
  return { error: error as Error, hint };
};

describe("withTimeout", () => {
  it("gives the value on success and reports nothing", async () => {
    expect(await withTimeout("store", async () => 42)).toEqual({ ok: true, value: 42 });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports a rejection with its cause and extra, flushes, and gives ok false", async () => {
    const cause = new Error("down");
    const result = await withTimeout("email store failed", () => Promise.reject(cause), {
      extra: { reportId: "k7m2qx" },
    });
    expect(result).toEqual({ ok: false });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const { error, hint } = captured();
    expect(error.message).toBe("email store failed");
    expect(error.cause).toBe(cause);
    expect(hint).toEqual({ extra: { reportId: "k7m2qx" } });
    expect(Sentry.flush).toHaveBeenCalledWith(2000);
  });

  it("passes no hint when no extra is given", async () => {
    await withTimeout("x", () => Promise.reject(new Error("down")));
    expect(vi.mocked(Sentry.captureException).mock.calls[0]).toHaveLength(1);
  });

  it("aborts the signal and reports a timeout after 3 s", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = withTimeout(
      "report read failed",
      (s) => {
        signal = s;
        return new Promise(() => {});
      },
      { extra: { reportId: "k7m2qx" } },
    );
    await vi.advanceTimersByTimeAsync(2999);
    expect(signal?.aborted).toBe(false);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: false });
    expect(signal?.aborted).toBe(true);
    const { error, hint } = captured();
    expect(error.message).toBe("report read failed");
    expect(String(error.cause)).toMatch(/timed out/);
    expect(hint).toEqual({ extra: { reportId: "k7m2qx" } });
    expect(Sentry.flush).toHaveBeenCalled();
  });

  it("takes another limit", async () => {
    vi.useFakeTimers();
    const pending = withTimeout("send", () => new Promise(() => {}), { ms: 5000 });
    await vi.advanceTimersByTimeAsync(4999);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: false });
  });
});
