/**
 * Reports which catalogued environment variables are set and well-formed for a
 * phase. Runnable (`pnpm verify:env`) and
 * importable for tests. Shape checks only — no network. The phase is the first
 * argument: `pnpm verify:env 1`.
 *
 * {@link openspec/specs/env/spec.md#requirement-verifyenv-reports-every-variable-for-a-phase}
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type EnvStatus = "ok" | "missing" | "invalid" | "skipped";
export type EnvResult = { name: string; status: EnvStatus; detail?: string };
export type EnvReport = { ok: boolean; results: EnvResult[] };

export type Probe = {
  name: string;
  phase: number;
  optional?: boolean;
  hint: string;
  shape?: RegExp;
};

export const PROBES: Probe[] = [
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    phase: 0,
    hint: "Sentry → Project settings → Client Keys (DSN)",
    shape: /^https:\/\/[^@]+@[^/]+\/\d+$/,
  },
  {
    name: "NEXT_PUBLIC_SENTRY_ENVIRONMENT",
    phase: 0,
    optional: true,
    hint: "defaults to the Vercel environment",
  },
  { name: "SENTRY_ORG", phase: 0, optional: true, hint: "Sentry org slug (source-map upload)" },
  {
    name: "SENTRY_PROJECT",
    phase: 0,
    optional: true,
    hint: "Sentry project slug (source-map upload)",
  },
  {
    name: "SENTRY_AUTH_TOKEN",
    phase: 0,
    optional: true,
    hint: "Sentry → Settings → Auth Tokens (org token)",
    shape: /^sntrys_/,
  },
  {
    name: "NEXT_PUBLIC_POSTHOG_KEY",
    phase: 0,
    hint: "PostHog → Project settings → Project API key",
    shape: /^phc_/,
  },
  {
    name: "NEXT_PUBLIC_POSTHOG_HOST",
    phase: 0,
    optional: true,
    hint: "defaults to https://us.i.posthog.com",
    shape: /^https:\/\//,
  },
];

function loadEnvLocal(): Record<string, string> {
  const file = path.resolve(import.meta.dirname, "../apps/web/.env.local");
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m?.[1]) out[m[1]] = (m[2] ?? "").trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

export function verifyEnv({
  phase = 0,
  env,
}: { phase?: number; env?: Record<string, string | undefined> } = {}): EnvReport {
  const source = env ?? { ...loadEnvLocal(), ...process.env };
  const results = PROBES.map((p): EnvResult => {
    const value = (source[p.name] ?? "").trim();
    if (p.phase > phase) return { name: p.name, status: "skipped", detail: `phase ${p.phase}` };
    if (!value) {
      return p.optional
        ? { name: p.name, status: "skipped", detail: "optional, unset" }
        : { name: p.name, status: "missing", detail: p.hint };
    }
    if (p.shape && !p.shape.test(value)) {
      return { name: p.name, status: "invalid", detail: `expected ${p.shape}; ${p.hint}` };
    }
    return { name: p.name, status: "ok" };
  });
  return { ok: results.every((r) => r.status === "ok" || r.status === "skipped"), results };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = verifyEnv({ phase: Number(process.argv[2] ?? 0) });
  for (const r of report.results) {
    console.log(`${r.status.padEnd(8)} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  }
  process.exit(report.ok ? 0 : 1);
}
