/**
 * The pre-commit gate actually reaching its unit-test branch.
 *
 * It did not, for as long as the branch existed. The test-file probe piped
 * `find` into `head -1`; `head` exits after one line, `find` keeps writing and
 * takes SIGPIPE, and `set -o pipefail` + `set -e` made 141 the script's own exit
 * status — after the type check, before `pnpm test:unit`. Claude Code only
 * blocks on exit 2, so every agent commit was allowed with the unit suite never
 * run, while CLAUDE.md said the opposite.
 *
 * Nothing in normal operation catches that: the gate exits non-zero either way
 * and the commit goes through. So: a throwaway project root with a stub `pnpm`
 * on PATH, which records the subcommands the script asks for.
 *
 * The temp root needs MANY test files, not one. SIGPIPE only fires once `find`
 * is still writing after `head` is gone, so a handful of paths fit in the pipe
 * buffer and reproduce nothing — this suite is green against the broken script
 * unless its own workspace overflows it.
 *
 * @see scripts/hooks/pre-commit-tests.sh
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const root = mkdtempSync(join(tmpdir(), "precommit-gate-"));

mkdirSync(join(root, "scripts/hooks"), { recursive: true });
mkdirSync(join(root, "node_modules"), { recursive: true }); // the gate no-ops without it
mkdirSync(join(root, "bin"), { recursive: true });
for (const file of ["pre-commit-tests.sh", "is-git-commit.sh"]) {
  copyFileSync(join("scripts/hooks", file), join(root, "scripts/hooks", file));
}

// Enough output to overflow the pipe buffer `head -1` would have left behind
// (16KB on macOS, 64KB on Linux): ~600 paths of ~200 bytes is ~120KB of `find`
// output, comfortably past both. Cheap — they are empty files.
const deepDir = join(root, "apps", "a".repeat(80), "b".repeat(80));
mkdirSync(deepDir, { recursive: true });
for (let i = 0; i < 600; i++) {
  writeFileSync(join(deepDir, `padding-${String(i).padStart(4, "0")}.test.ts`), "");
}

// A stub pnpm that logs what it was asked to run. `failing` makes `test:unit`
// exit 1, which is the only way to observe the BLOCKED branch.
function installStubPnpm({ failing }: { failing: boolean }) {
  const log = join(root, "pnpm.log");
  rmSync(log, { force: true });
  writeFileSync(
    join(root, "bin/pnpm"),
    "#!/usr/bin/env bash\n" +
      `echo "$@" >> ${JSON.stringify(log)}\n` +
      (failing ? 'if [[ "$1" == "test:unit" ]]; then exit 1; fi\n' : "") +
      "exit 0\n",
    { mode: 0o755 },
  );
  return log;
}

function runGate(projectRoot = root, command = "git commit -m x") {
  const result = spawnSync("bash", [join(projectRoot, "scripts/hooks/pre-commit-tests.sh")], {
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    // A hermetic PATH, not an inherited one: the stub pnpm has to win over a
    // real one, and the gate's own dependencies (bash, cat, printf, find, tr,
    // grep, dirname) all live in /usr/bin:/bin. It also keeps this file free of
    // a NAMED `process.env` read — the spread below is not one — which the
    // three-place-rule guard in env-coverage.test.ts would flag as undeclared.
    // (That guard scans comments too, so this one cannot spell out the shape.)
    env: { ...process.env, PATH: `${join(root, "bin")}:/usr/bin:/bin` },
    encoding: "utf8",
  });
  return { status: result.status, stderr: result.stderr };
}

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("the pre-commit gate's unit-test branch", () => {
  it("reaches pnpm test:unit when test files exist", () => {
    const log = installStubPnpm({ failing: false });
    const { status, stderr } = runGate();

    // 141 is the regression: SIGPIPE from the old `find | head -1` probe.
    expect(status).not.toBe(141);
    expect(status).toBe(0);
    expect(stderr).toContain("Running unit tests...");
    expect(stderr).toContain("Tests passed.");
    expect(readFileSync(log, "utf8").split("\n").filter(Boolean)).toEqual([
      "format:check",
      "lint",
      "typecheck",
      "test:unit",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-tests-outside-the-app} */
  it("finds a test that lives only under packages/", () => {
    const pkgOnly = mkdtempSync(join(tmpdir(), "precommit-gate-pkg-"));
    mkdirSync(join(pkgOnly, "scripts/hooks"), { recursive: true });
    mkdirSync(join(pkgOnly, "node_modules"), { recursive: true });
    mkdirSync(join(pkgOnly, "packages/analysis/src"), { recursive: true });
    writeFileSync(join(pkgOnly, "packages/analysis/src/a.test.ts"), "");
    for (const file of ["pre-commit-tests.sh", "is-git-commit.sh"]) {
      copyFileSync(join("scripts/hooks", file), join(pkgOnly, "scripts/hooks", file));
    }
    const log = installStubPnpm({ failing: false });

    expect(runGate(pkgOnly).status).toBe(0);
    expect(readFileSync(log, "utf8")).toContain("test:unit");
    rmSync(pkgOnly, { recursive: true, force: true });
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-failing-unit-test} */
  it("blocks with exit 2 when the unit suite fails", () => {
    installStubPnpm({ failing: true });
    const { status, stderr } = runGate();

    expect(status).toBe(2);
    expect(stderr).toContain("BLOCKED: Tests failed.");
  });

  it("exits 0 without running tests when no workspace root holds a test file", () => {
    const empty = mkdtempSync(join(tmpdir(), "precommit-gate-empty-"));
    mkdirSync(join(empty, "scripts/hooks"), { recursive: true });
    mkdirSync(join(empty, "node_modules"), { recursive: true });
    mkdirSync(join(empty, "apps/web/src"), { recursive: true });
    for (const file of ["pre-commit-tests.sh", "is-git-commit.sh"]) {
      copyFileSync(join("scripts/hooks", file), join(empty, "scripts/hooks", file));
    }
    const log = installStubPnpm({ failing: false });

    const { status, stderr } = runGate(empty);

    expect(status).toBe(0);
    expect(stderr).not.toContain("Running unit tests...");
    expect(readFileSync(log, "utf8")).not.toContain("test:unit");
    rmSync(empty, { recursive: true, force: true });
  });

  // The `|| true` on the probe. `find` also exits non-zero when a workspace
  // root does not exist, and under `set -e` that is the same silent skip by another
  // route — nothing else here would notice if someone dropped it.
  it("exits 0 when no workspace root exists at all", () => {
    const noSrc = mkdtempSync(join(tmpdir(), "precommit-gate-noroots-"));
    mkdirSync(join(noSrc, "scripts/hooks"), { recursive: true });
    mkdirSync(join(noSrc, "node_modules"), { recursive: true });
    for (const file of ["pre-commit-tests.sh", "is-git-commit.sh"]) {
      copyFileSync(join("scripts/hooks", file), join(noSrc, "scripts/hooks", file));
    }
    installStubPnpm({ failing: false });

    expect(runGate(noSrc).status).toBe(0);
    rmSync(noSrc, { recursive: true, force: true });
  });

  it("does not intercept a command that is not a git commit", () => {
    installStubPnpm({ failing: true });
    expect(runGate(root, "pnpm build").status).toBe(0);
  });
});
