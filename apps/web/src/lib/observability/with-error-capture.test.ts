import fs from "node:fs";
import path from "node:path";

import * as Sentry from "@sentry/nextjs";
import { describe, expect, it, vi } from "vitest";

import { withErrorCapture } from "./with-error-capture";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  createTransport: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

describe("withErrorCapture", () => {
  /** {@link openspec/specs/observability/spec.md#scenario-a-wrapped-handler-throws} */
  it("captures, flushes and rethrows", async () => {
    const error = new Error("boom");
    const handler = withErrorCapture(() => {
      throw error;
    });
    await expect(handler()).rejects.toBe(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(Sentry.flush).toHaveBeenCalled();
  });

  it("passes a result through untouched", async () => {
    expect(await withErrorCapture((n: number) => n + 1)(1)).toBe(2);
  });
});

describe("route handlers", () => {
  const APP = path.resolve(import.meta.dirname, "../../app");

  function routes(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return routes(full);
      return /^route\.tsx?$/.test(e.name) ? [full] : [];
    });
  }

  /** {@link openspec/specs/observability/spec.md#scenario-a-route-handler-without-the-wrapper} */
  it("are all wrapped in withErrorCapture", () => {
    const unwrapped = routes(APP)
      .filter((f) => !fs.readFileSync(f, "utf8").includes("withErrorCapture("))
      .map((f) => path.relative(APP, f));
    expect(unwrapped).toEqual([]);
  });
});
