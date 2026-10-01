/**
 * The spec gate's Bash matcher. `check-spec-exists` used to be a PreToolUse hook
 * on Edit|Write only, so an agent working through the shell — which is the
 * default in this repo — never tripped it and spec-first was enforced by good
 * intentions alone.
 *
 * The matcher catches the common forgetful shapes, not every possible write.
 * The cases it deliberately misses are pinned below so the holes stay a
 * documented list rather than something someone has to remember.
 *
 * @see scripts/hooks/bash-write-targets.py
 * @see scripts/hooks/check-spec-exists.sh
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

function targets(command: string): string[] {
  const out = execFileSync("python3", ["scripts/hooks/bash-write-targets.py"], {
    input: command,
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

describe("the spec gate's Bash write-target matcher", () => {
  it.each([
    ["sed -i '' 's/a/b/' apps/web/src/lib/types.ts", ["apps/web/src/lib/types.ts"]], // BSD in-place
    ["sed -i.bak -e 's/a/b/' apps/web/src/lib/types.ts", ["apps/web/src/lib/types.ts"]], // GNU, -e script
    [
      "sed -i 's/a/b/' apps/web/src/a.ts apps/web/src/b.ts",
      ["apps/web/src/a.ts", "apps/web/src/b.ts"],
    ],
    ["echo hi > apps/web/src/lib/types.ts", ["apps/web/src/lib/types.ts"]],
    ["echo hi >>apps/web/src/lib/types.ts", ["apps/web/src/lib/types.ts"]],
    ["pnpm test | tee -a apps/web/src/lib/types.ts", ["apps/web/src/lib/types.ts"]],
    ["git add -A && printf x > apps/web/src/lib/types.ts", ["apps/web/src/lib/types.ts"]],
    [
      "cat > apps/web/src/lib/types.ts <<'EOF'\nif (a > b) { x('c'); }\nEOF",
      ["apps/web/src/lib/types.ts"],
    ],
  ])("catches %j", (command, expected) => {
    expect(targets(command)).toEqual(expected);
  });

  it.each([
    "pnpm test",
    "pnpm build > /tmp/build.log 2>&1", // a real target, just not a source path
    "grep -rn foo apps/ && git diff",
    "cat apps/web/src/lib/types.ts",
    "sed -n '1,5p' apps/web/src/lib/types.ts", // reads, no -i
    'git commit -m "fix: a > b"', // the > is inside a quoted string
    "tee /tmp/x < apps/web/src/lib/types.ts", // input redirect, not a write
    "echo it's unbalanced", // shlex cannot tokenize this
  ])("reports no source-path write for %j", (command) => {
    expect(targets(command).filter((t) => t.startsWith("apps/"))).toEqual([]);
  });

  // The holes. Each of these DOES write a source file and the matcher lets it
  // through, on purpose: extracting the path would mean guessing, and a gate
  // that guesses blocks legitimate commands and gets switched off. CLAUDE.md
  // (Hooks) states the same list.
  it.each([
    ["a path from a shell variable", "sed -i '' 's/a/b/' $FILE"],
    ["a glob target", "sed -i '' 's/a/b/' apps/web/src/**/*.ts"],
    [
      "a script that writes files itself",
      "python3 - <<'PY'\nopen('apps/web/src/lib/types.ts','w')\nPY",
    ],
    ["a cp/mv destination", "cp /tmp/new.ts apps/web/src/lib/types.ts"],
    ["a patch application", "git apply /tmp/change.diff"],
    ["a cd into another root", "cd apps/web && sed -i '' 's/a/b/' src/lib/types.ts"],
  ])("deliberately does not catch %s", (_label, command) => {
    expect(targets(command).filter((t) => t.startsWith("apps/"))).toEqual([]);
  });
});

// The matcher being right is worth nothing if the gate never consults it, and
// nothing in normal operation exercises the blocking path (it needs a mapped
// path whose spec file is missing, which never happens in this repo). So: a
// throwaway project root with one mapped-but-missing spec.
describe("the gate wired end to end", () => {
  const root = mkdtempSync(join(tmpdir(), "spec-gate-"));

  mkdirSync(join(root, "scripts/hooks"), { recursive: true });
  mkdirSync(join(root, "openspec/specs/exists"), { recursive: true });
  for (const file of ["check-spec-exists.sh", "bash-write-targets.py"]) {
    copyFileSync(join("scripts/hooks", file), join(root, "scripts/hooks", file));
  }
  writeFileSync(
    join(root, "openspec/specs/README.md"),
    "| Capability | Source path globs |\n|---|---|\n" +
      "| `nonexistent` | `apps/web/src/lib/fake.ts` |\n" +
      "| `exists` | `apps/web/src/lib/real.ts` |\n" +
      // Literal path segments that are also regex metacharacters. Neither spec
      // exists here, so a matching path blocks and a non-matching one does not.
      "| `dynamic` | `apps/web/src/app/x/[slug]/**` |\n" +
      "| `grouped` | `apps/web/src/app/y/(marketing)/**` |\n",
  );
  writeFileSync(join(root, "openspec/specs/exists/spec.md"), "# a spec that exists\n");

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  function exitCode(payload: object | string): number {
    try {
      execFileSync("bash", [join(root, "scripts/hooks/check-spec-exists.sh")], {
        input: typeof payload === "string" ? payload : JSON.stringify(payload),
        stdio: ["pipe", "pipe", "pipe"],
      });
      return 0;
    } catch (error) {
      return (error as { status: number }).status;
    }
  }

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-mapped-path-with-a-missing-spec} */
  it("blocks a Bash write to a path whose spec is missing", () => {
    expect(
      exitCode({ tool_name: "Bash", tool_input: { command: "echo x > apps/web/src/lib/fake.ts" } }),
    ).toBe(2);
    expect(
      exitCode({
        tool_name: "Bash",
        tool_input: { command: "echo x > ./apps/web/src/lib/fake.ts" },
      }),
    ).toBe(2);
  });

  it("blocks on the second target when the first one is exempt", () => {
    // scripts/** is spec-exempt, so the loop has to skip it and keep going.
    const command = "sed -i '' 's/a/b/' scripts/x.sh apps/web/src/lib/fake.ts";
    expect(exitCode({ tool_name: "Bash", tool_input: { command } })).toBe(2);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-mapped-path-with-an-existing-spec} */
  it("allows a mapped path whose spec is present", () => {
    // The branch that would block real work if it ever broke.
    const command = "echo x > apps/web/src/lib/real.ts";
    expect(exitCode({ tool_name: "Bash", tool_input: { command } })).toBe(0);
  });

  it("still blocks the Edit/Write path it always gated", () => {
    expect(
      exitCode({ tool_name: "Write", tool_input: { file_path: "apps/web/src/lib/fake.ts" } }),
    ).toBe(2);
    expect(
      exitCode({
        tool_name: "Edit",
        tool_input: { file_path: join(root, "apps/web/src/lib/fake.ts") },
      }),
    ).toBe(2);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-write-target-the-gate-cannot-read} */
  it("allows anything it cannot read a path out of", () => {
    for (const command of [
      "pnpm test",
      "python3 - <<'PY'\nopen('apps/web/src/lib/fake.ts','w')\nPY", // heredoc body, by design
      "sed -i '' 's/a/b/' $FILE",
      "echo it's unbalanced",
    ]) {
      expect(exitCode({ tool_name: "Bash", tool_input: { command } })).toBe(0);
    }
  });

  it("exits 0 on a payload it cannot parse at all", () => {
    expect(exitCode("not json at all")).toBe(0);
    expect(exitCode("")).toBe(0);
  });

  // A glob is a glob, not a regex. `[slug]` used to survive the conversion as a
  // character class and `(marketing)` as a capture group, so each row matched
  // some path that does not exist and missed the one it names.
  it.each([
    ["apps/web/src/app/x/[slug]/page.tsx", 2], // the directory the row actually names
    ["apps/web/src/app/x/s/page.tsx", 0], // a character class would match this one
    ["apps/web/src/app/y/(marketing)/page.tsx", 2],
    ["apps/web/src/app/y/marketing/page.tsx", 0], // a capture group would match this one
  ])("reads %j as a literal path segment", (file_path, expected) => {
    expect(exitCode({ tool_name: "Write", tool_input: { file_path } })).toBe(expected);
  });
});
