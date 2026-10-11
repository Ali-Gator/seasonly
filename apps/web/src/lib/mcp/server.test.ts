/**
 * An error inside a tool or resource callback still reaches Sentry, though the SDK turns it into
 * an error result before the route's `withErrorCapture` could see it.
 *
 * @see openspec/specs/chat-plugin/spec.md
 */
import * as Sentry from "@sentry/nextjs";
import { describe, expect, it, vi } from "vitest";

import { reported } from "./server";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

describe("reported", () => {
  /** {@link openspec/specs/observability/spec.md#scenario-a-wrapped-handler-throws} */
  it("captures, flushes and rethrows a callback's error", async () => {
    const error = new Error("boom");
    await expect(reported(async () => Promise.reject(error))()).rejects.toBe(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(Sentry.flush).toHaveBeenCalled();
  });

  it("passes a result through untouched", async () => {
    expect(await reported(async (n: number) => n + 1)(1)).toBe(2);
  });
});
