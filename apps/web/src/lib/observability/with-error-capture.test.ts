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

  const METHOD = "GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS";

  /** Each exported HTTP method that is not `export const M = withErrorCapture(...)`. */
  function unwrapped(file: string, text: string): string[] {
    const bad = [
      ...text.matchAll(new RegExp(`export\\s+(?:async\\s+)?function\\s+(${METHOD})\\b`, "g")),
    ].map((m) => `${file}: ${m[1]}`);
    for (const m of text.matchAll(
      new RegExp(`export\\s+const\\s+(${METHOD})\\s*=\\s*(\\S+?)\\(`, "g"),
    )) {
      if (m[2] !== "withErrorCapture") bad.push(`${file}: ${m[1]}`);
    }
    return bad;
  }

  /** {@link openspec/specs/observability/spec.md#scenario-a-route-handler-without-the-wrapper} */
  it("are all wrapped in withErrorCapture", () => {
    const bad = routes(APP).flatMap((f) =>
      unwrapped(path.relative(APP, f), fs.readFileSync(f, "utf8")),
    );
    expect(bad).toEqual([]);
  });

  it("names a bare function handler and a handler wrapped in something else", () => {
    const text = [
      "// withErrorCapture( in a comment does not count",
      "export const GET = withErrorCapture(() => new Response());",
      "export async function POST() { return new Response(); }",
      "export const PUT = other(() => new Response());",
    ].join("\n");
    expect(unwrapped("r.ts", text)).toEqual(["r.ts: POST", "r.ts: PUT"]);
  });
});
