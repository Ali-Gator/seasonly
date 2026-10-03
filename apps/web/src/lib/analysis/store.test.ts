/**
 * The reports table runs as SQL: the migration is loaded into PGlite after recreating Supabase's
 * roles (`service_role` bypasses RLS, as on Supabase) and replaying its default grants on
 * `public`, as in daily-cap.test.ts.
 *
 * @see openspec/specs/season-reveal/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type ReportInsert, type ReportRecord, type ReportRow, saveReport } from "./store";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../../supabase/migrations");

function migration(): string {
  const file = fs.readdirSync(MIGRATIONS).find((f) => f.endsWith("_reports.sql"));
  if (!file) throw new Error("no *_reports.sql migration");
  return fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
}

async function database(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `);
  await db.exec(migration());
  return db;
}

const COLUMNS = [
  "id",
  "season",
  "runner_up",
  "confidence",
  "agreement",
  "traits",
  "answers",
  "photo_verdict",
  "text_source",
  "summary",
  "agreement_note",
  "is_test",
] as const satisfies readonly (keyof ReportRow)[];

/** The production insert's shape, answered by PGlite as the server's role. */
const pgliteInsert =
  (db: PGlite): ReportInsert =>
  async (row) => {
    await db.exec("set role service_role");
    try {
      await db.query(
        `insert into public.reports (${COLUMNS.join(", ")}) values (${COLUMNS.map((_, i) => `$${i + 1}`).join(", ")})`,
        COLUMNS.map((c) => (c === "traits" || c === "answers" ? JSON.stringify(row[c]) : row[c])),
      );
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

const PERSONAL: ReportRecord = {
  season: "soft-autumn",
  runnerUp: "true-autumn",
  confidence: 0.62,
  agreement: "agree",
  traits: { temperature: 0.4, value: 0, clarity: -0.8 },
  answers: { veins: "green", jewelry: "gold" },
  photoVerdict: "ok",
  textSource: "personal",
  summary: "Your coloring is warm and soft.",
  agreementNote: "Green veins and gold jewelry point warm.",
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("saveReport", () => {
  /** {@link openspec/specs/season-reveal/spec.md#scenario-a-personal-result} */
  it("stores a personal result under a 22-character URL-safe id", async () => {
    const db = await database();
    const id = await saveReport(PERSONAL, { insert: pgliteInsert(db) });
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const { rows } = await db.query<Record<string, unknown>>(
      "select * from public.reports where id = $1",
      [id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      season: "soft-autumn",
      runner_up: "true-autumn",
      agreement: "agree",
      traits: PERSONAL.traits,
      answers: PERSONAL.answers,
      photo_verdict: "ok",
      text_source: "personal",
      summary: PERSONAL.summary,
      agreement_note: PERSONAL.agreementNote,
    });
    expect(Number(rows[0]?.confidence)).toBe(0.62);
    expect(Object.keys(rows[0] ?? {})).not.toEqual(expect.arrayContaining(["crop", "email"]));
  });

  /** {@link openspec/specs/season-reveal/spec.md#requirement-a-result-is-stored-under-an-unguessable-id} */
  it("gives every report its own id", async () => {
    const db = await database();
    const ids = await Promise.all(
      Array.from({ length: 20 }, () => saveReport(PERSONAL, { insert: pgliteInsert(db) })),
    );
    expect(new Set(ids).size).toBe(20);
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-a-preview-deployment} */
  it("marks a record as test data outside production", async () => {
    const rows: ReportRow[] = [];
    const insert: ReportInsert = async (row) => (rows.push(row), { error: null });
    vi.stubEnv("VERCEL_ENV", "preview");
    await saveReport(PERSONAL, { insert });
    vi.stubEnv("VERCEL_ENV", "");
    await saveReport(PERSONAL, { insert });
    vi.stubEnv("VERCEL_ENV", "production");
    await saveReport(PERSONAL, { insert });
    expect(rows.map((r) => r.is_test)).toEqual([true, true, false]);
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-database-is-down} */
  it("gives null and reports to Sentry when the insert fails", async () => {
    expect(
      await saveReport(PERSONAL, { insert: async () => ({ error: { message: "boom" } }) }),
    ).toBeNull();
    expect(await saveReport(PERSONAL, { insert: () => Promise.reject(new Error("down")) })).toBe(
      null,
    );
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    expect(Sentry.flush).toHaveBeenCalled();
  });

  /** {@link openspec/specs/season-reveal/spec.md#requirement-a-failed-save-never-blocks-the-reveal} */
  it("gives null after 3 s when the database never answers", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = saveReport(PERSONAL, {
      insert: (_row, s) => {
        signal = s;
        return new Promise(() => {});
      },
    });
    await vi.advanceTimersByTimeAsync(2999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBeNull();
    expect(signal?.aborted).toBe(true);
  });
});

describe("reports table", () => {
  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-public-role-reads-reports} */
  it("refuses the anonymous role both select and insert", async () => {
    const db = await database();
    expect(await saveReport(PERSONAL, { insert: pgliteInsert(db) })).not.toBeNull();
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(db.query("select * from public.reports")).rejects.toThrow(/permission denied/);
      await expect(
        db.query(
          "insert into public.reports (id, season, runner_up, confidence, agreement, traits, answers, text_source, is_test) values ('x', 'soft-autumn', 'true-autumn', 0.5, 'agree', '{}', '{}', 'personal', true)",
        ),
      ).rejects.toThrow(/permission denied/);
    }
  });
});
