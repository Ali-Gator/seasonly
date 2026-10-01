/**
 * The env catalogue in openspec/specs/env/spec.md is the one list of variables; the
 * code, `.env.example`, `verify:env` and the client boundary are all checked against it.
 *
 * Dynamic reads (`process.env[name]` with a variable) are not detected; the common
 * failure is a new direct read, and that is what this catches.
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PROBES, verifyEnv, type EnvResult } from "../verify-env.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const SELF = path.relative(REPO_ROOT, import.meta.filename);
const PLATFORM = new Set([
  "NODE_ENV",
  "NEXT_RUNTIME",
  "CI",
  "VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_ENV",
]);
const DIRECT_READ = /process\.env(?:\.([A-Z_][A-Z0-9_]*)|\[\s*["']([A-Z_][A-Z0-9_]*)["']\s*\])/g;
const CATALOGUE = path.join(REPO_ROOT, "openspec/specs/env/spec.md");

type Entry = { name: string; phase: number; optional: boolean };

/** Rows of the catalogue table: | `NAME` | phase | required | browser | hint |. */
function catalogue(): Entry[] {
  return [
    ...fs
      .readFileSync(CATALOGUE, "utf8")
      .matchAll(/^\|\s*`([A-Z_][A-Z0-9_]*)`\s*\|\s*(\d+)\s*\|\s*(yes|no)\s*\|/gm),
  ].map((m) => ({ name: m[1] ?? "", phase: Number(m[2]), optional: m[3] === "no" }));
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return ["node_modules", ".next"].includes(e.name) ? [] : walk(full);
    return /\.(ts|tsx|mjs)$/.test(e.name) ? [full] : [];
  });
}

const sources = ["apps", "packages", "scripts"]
  .flatMap((d) => walk(path.join(REPO_ROOT, d)))
  .map((f) => path.relative(REPO_ROOT, f))
  .filter((f) => f !== SELF);

function reads(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const file of sources) {
    for (const m of fs.readFileSync(path.join(REPO_ROOT, file), "utf8").matchAll(DIRECT_READ)) {
      const name = m[1] ?? m[2];
      if (!name || PLATFORM.has(name)) continue;
      out.set(name, [...new Set([...(out.get(name) ?? []), file])]);
    }
  }
  return out;
}

describe("env catalogue", () => {
  /** {@link openspec/specs/env/spec.md#scenario-a-new-variable-is-read-without-being-catalogued} */
  it("every direct process.env read is in .env.example and the catalogue", () => {
    const example = fs.readFileSync(path.join(REPO_ROOT, "apps/web/.env.example"), "utf8");
    const names = new Set(catalogue().map((e) => e.name));
    const missing = [...reads()]
      .filter(([name]) => !new RegExp(`^${name}=`, "m").test(example) || !names.has(name))
      .map(([name, files]) => `${name} (read in ${files.join(", ")})`);
    expect(missing).toEqual([]);
  });

  /** {@link openspec/specs/env/spec.md#scenario-a-client-module-references-a-server-secret} */
  it("no browser file references a server-only variable", () => {
    const serverOnly = catalogue()
      .map((e) => e.name)
      .filter((n) => !n.startsWith("NEXT_PUBLIC_"));
    const isClient = (file: string, text: string) =>
      file.endsWith("instrumentation-client.ts") ||
      /^(?:\s|\/\/.*\n|\/\*[\s\S]*?\*\/)*["']use client["']/.test(text);
    const offenders = sources.flatMap((file) => {
      const text = fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
      if (!isClient(file, text)) return [];
      return serverOnly.filter((k) => text.includes(k)).map((k) => `${file}: ${k}`);
    });
    expect(offenders).toEqual([]);
  });
});

describe("verify:env", () => {
  const row = (results: EnvResult[], name: string) => results.find((r) => r.name === name);

  /** {@link openspec/specs/env/spec.md#requirement-verifyenv-reports-every-variable-for-a-phase} */
  it("probes exactly the catalogue, with the same phases and required flags", () => {
    const probes = PROBES.map((p) => ({
      name: p.name,
      phase: p.phase,
      optional: Boolean(p.optional),
    }));
    expect(probes).toEqual(catalogue());
  });

  /** {@link openspec/specs/env/spec.md#scenario-nothing-is-set} */
  it("marks required phase-0 keys missing and optional ones skipped when nothing is set", () => {
    const report = verifyEnv({ phase: 0, env: {} });
    expect(report.ok).toBe(false);
    for (const name of ["NEXT_PUBLIC_SENTRY_DSN", "NEXT_PUBLIC_POSTHOG_KEY"]) {
      expect(row(report.results, name)).toMatchObject({ status: "missing" });
      expect(row(report.results, name)?.detail).toBeTruthy();
    }
    expect(row(report.results, "SENTRY_AUTH_TOKEN")?.status).toBe("skipped");
  });

  /** {@link openspec/specs/env/spec.md#scenario-a-malformed-value} */
  it("reports a malformed value as invalid", () => {
    const report = verifyEnv({
      env: { NEXT_PUBLIC_SENTRY_DSN: "not-a-dsn", NEXT_PUBLIC_POSTHOG_KEY: "phc_x" },
    });
    expect(row(report.results, "NEXT_PUBLIC_SENTRY_DSN")?.status).toBe("invalid");
    expect(report.ok).toBe(false);
  });

  it("passes with well-formed required keys", () => {
    const report = verifyEnv({
      env: {
        NEXT_PUBLIC_SENTRY_DSN: "https://abc@o1.ingest.us.sentry.io/123",
        NEXT_PUBLIC_POSTHOG_KEY: "phc_x",
      },
    });
    expect(report.ok).toBe(true);
  });
});
