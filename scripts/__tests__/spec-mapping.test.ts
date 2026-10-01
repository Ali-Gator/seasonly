/**
 * The mapping table stays unambiguous: one owner per file, no dead rows. The glob
 * conversion mirrors scripts/hooks/check-spec-exists.sh, so a row means here exactly
 * what it means to the hook.
 *
 * @see openspec/specs/README.md
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

type Row = { capability: string; globs: string[] };

function parseRows(markdown: string): Row[] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|").map((cell) => cell.trim().replace(/`/g, "")))
    .filter(([, cap]) => cap && cap !== "Capability" && !/^-+$/.test(cap))
    .map(([, capability = "", globs = ""]) => ({
      capability,
      globs: globs
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    }));
}

/** Same conversion as the hook: escape regex metacharacters, then `**` → `.*`, `*` → `[^/]*`. */
function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[\\.[\]()+?{}^$|]/g, "\\$&");
  const pattern = escaped.replace(/\*\*/g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, ".*");
  return new RegExp(`^${pattern}$`);
}

function problems(rows: Row[], files: string[]): string[] {
  const out: string[] = [];
  const matchers = rows.map((r) => ({ ...r, res: r.globs.map(globToRegex) }));
  for (const row of matchers) {
    if (!files.some((f) => row.res.some((re) => re.test(f)))) {
      out.push(`${row.capability}: matches no file`);
    }
  }
  for (const file of files) {
    const owners = matchers.filter((r) => r.res.some((re) => re.test(file)));
    if (owners.length > 1) out.push(`${file}: ${owners.map((o) => o.capability).join(", ")}`);
  }
  return out;
}

function repoFiles(): string[] {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

describe("the spec mapping table", () => {
  it("has one owner per file and no row that matches nothing", () => {
    const readme = fs.readFileSync(path.join(REPO_ROOT, "openspec/specs/README.md"), "utf8");
    expect(problems(parseRows(readme), repoFiles())).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-two-rows-claim-one-file} */
  it("names a file two rows claim", () => {
    const rows = [
      { capability: "a", globs: ["apps/web/src/lib/**"] },
      { capability: "b", globs: ["apps/web/src/lib/x.ts"] },
    ];
    expect(problems(rows, ["apps/web/src/lib/x.ts"])).toEqual(["apps/web/src/lib/x.ts: a, b"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-row-that-matches-nothing} */
  it("names a row that matches no file", () => {
    expect(problems([{ capability: "dead", globs: ["apps/web/src/gone/**"] }], ["a.ts"])).toEqual([
      "dead: matches no file",
    ]);
  });

  it("reads brackets and parentheses as literal path segments", () => {
    expect(
      globToRegex("apps/web/src/app/seasons/[season]/**").test(
        "apps/web/src/app/seasons/[season]/page.tsx",
      ),
    ).toBe(true);
    expect(
      globToRegex("apps/web/src/app/seasons/[season]/**").test(
        "apps/web/src/app/seasons/s/page.tsx",
      ),
    ).toBe(false);
    expect(
      globToRegex("apps/web/src/app/(marketing)/*").test("apps/web/src/app/(marketing)/a.tsx"),
    ).toBe(true);
    expect(globToRegex("apps/web/src/*").test("apps/web/src/a/b.ts")).toBe(false);
  });
});

describe("change names", () => {
  const NAME = /^t\d+-[a-z0-9]+(-[a-z0-9]+)*$/;

  function badNames(names: string[]): string[] {
    // Archived changes carry a date prefix: 2026-10-04-t0-foundation.
    return names.map((n) => n.replace(/^\d{4}-\d{2}-\d{2}-/, "")).filter((n) => !NAME.test(n));
  }

  /** {@link openspec/specs/spec-workflow/spec.md#requirement-a-change-is-tied-to-its-tracker-row} */
  it("every change starts with its Tracker ID", () => {
    const dir = path.join(REPO_ROOT, "openspec/changes");
    const archive = path.join(dir, "archive");
    const names = [
      ...fs.readdirSync(dir).filter((n) => n !== "archive" && !n.startsWith(".")),
      ...(fs.existsSync(archive) ? fs.readdirSync(archive).filter((n) => !n.startsWith(".")) : []),
    ];
    expect(badNames(names)).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-change-without-a-tracker-id} */
  it("names a change without a Tracker ID", () => {
    expect(badNames(["t4-analysis-core", "2026-10-04-t0-foundation", "add-quiz", "T4-x"])).toEqual([
      "add-quiz",
      "T4-x",
    ]);
  });
});
