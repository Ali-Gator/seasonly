/**
 * The reports, report_emails, interest_clicks and retention migrations run as SQL in PGlite, after
 * recreating Supabase's roles and replaying its default grants on `public`, as in
 * email/store.test.ts. Those defaults already give the server's role every privilege, so delete is
 * revoked before the retention migration: the grant test then depends on the migration. The job's
 * delete runs as the server's role, so the cascade into the child tables is proven without grants
 * on them.
 *
 * @see openspec/specs/data-retention/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../../supabase/migrations");

function migration(suffix: string): string {
  const file = fs.readdirSync(MIGRATIONS).find((f) => f.endsWith(suffix));
  if (!file) throw new Error(`no *${suffix} migration`);
  return fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
}

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  for (const m of ["_reports.sql", "_report_emails.sql", "_interest_clicks.sql"]) {
    await db.exec(migration(m));
  }
  await db.exec(
    "revoke delete on public.reports, public.report_emails, public.interest_clicks from service_role",
  );
  await db.exec(migration("_retention.sql"));
}, 30_000);

const report = async (id: string, isTest: boolean, hoursOld: number) => {
  await db.query(
    `insert into public.reports (id, created_at, season, runner_up, confidence, agreement, traits, answers, text_source, is_test)
     values ($1, now() - make_interval(hours => $2), 'soft-autumn', 'soft-summer', 0.8, 'agree', '{}', '{}', 'quiz-only', $3)`,
    [id, hoursOld, isTest],
  );
  for (const email of ["a@example.com", "b@example.com"]) {
    await db.query(
      "insert into public.report_emails (report_id, email, is_test) values ($1, $2, $3)",
      [id, email, isTest],
    );
  }
  await db.query("insert into public.interest_clicks (report_id, is_test) values ($1, $2)", [
    id,
    isTest,
  ]);
};

const count = async (table: string, id: string) =>
  (
    await db.query<{ n: number }>(
      `select count(*)::int as n from public.${table} where ${table === "reports" ? "id" : "report_id"} = $1`,
      [id],
    )
  ).rows[0]?.n;

describe("deleting old test reports", () => {
  /**
   * {@link openspec/specs/data-retention/spec.md#scenario-an-old-test-report}
   * {@link openspec/specs/data-retention/spec.md#scenario-a-real-report}
   * {@link openspec/specs/data-retention/spec.md#scenario-a-fresh-test-report}
   */
  it("removes a 25 h old test report with its addresses and interest, keeping the rest", async () => {
    await report("old-test", true, 25);
    await report("real", false, 24 * 365);
    await report("fresh-test", true, 1);

    await db.exec("set role service_role");
    try {
      const { affectedRows } = await db.query(
        "delete from public.reports where is_test and created_at < now() - interval '24 hours'",
      );
      expect(affectedRows).toBe(1);
    } finally {
      await db.exec("reset role");
    }

    for (const table of ["reports", "report_emails", "interest_clicks"]) {
      expect(await count(table, "old-test")).toBe(0);
    }
    expect(await count("reports", "real")).toBe(1);
    expect(await count("report_emails", "real")).toBe(2);
    expect(await count("interest_clicks", "real")).toBe(1);
    expect(await count("reports", "fresh-test")).toBe(1);
    expect(await count("report_emails", "fresh-test")).toBe(2);
  });

  /** {@link openspec/specs/data-retention/spec.md#requirement-the-job-deletes-test-reports-older-than-24-hours} */
  it("grants delete on reports to the server's role only", async () => {
    const { rows } = await db.query<{ role: string; can: boolean }>(
      `select r as role, has_table_privilege(r, 'public.reports', 'delete') as can
       from unnest(array['service_role', 'anon', 'authenticated']) r`,
    );
    expect(rows).toEqual([
      { role: "service_role", can: true },
      { role: "anon", can: false },
      { role: "authenticated", can: false },
    ]);
  });
});
