/**
 * The pre-commit gate end to end: a throwaway project root with a stub `pnpm` on
 * PATH that records the subcommands the script asks for. Nothing in normal
 * operation exercises the blocking branches, so this is the only place they run.
 *
 * Claude Code blocks only on exit 2; any other non-zero exit (a SIGPIPE 141, a
 * missing command 127) reads as a non-blocking hook error and lets the commit
 * through. Every refusal below is therefore pinned to exactly 2.
 *
 * @see scripts/hooks/pre-commit-tests.sh
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

function makeRoot({ installed }: { installed: boolean }): string {
  const root = mkdtempSync(join(tmpdir(), "precommit-gate-"));
  mkdirSync(join(root, "scripts/hooks"), { recursive: true });
  mkdirSync(join(root, "bin"), { recursive: true });
  if (installed) mkdirSync(join(root, "node_modules"));
  for (const file of ["pre-commit-tests.sh", "is-git-commit.sh"]) {
    copyFileSync(join("scripts/hooks", file), join(root, "scripts/hooks", file));
  }
  return root;
}

// A stub pnpm that logs what it was asked to run. `failing` makes `test:unit` exit 1.
function installStubPnpm(root: string, { failing }: { failing: boolean }): string {
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

function runGate(root: string, command = "git commit -m x") {
  const result = spawnSync("bash", [join(root, "scripts/hooks/pre-commit-tests.sh")], {
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    // A hermetic PATH so the stub pnpm wins over a real one; the gate's own
    // dependencies (bash, cat, printf, tr, grep, dirname, python3) live in /usr/bin:/bin.
    env: { ...process.env, PATH: `${join(root, "bin")}:/usr/bin:/bin` },
    encoding: "utf8",
  });
  return { status: result.status, stderr: result.stderr };
}

const roots: string[] = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

describe("the pre-commit gate", () => {
  it("runs format, lint, typecheck and the unit suite, in that order", () => {
    const root = makeRoot({ installed: true });
    roots.push(root);
    const log = installStubPnpm(root, { failing: false });

    const { status, stderr } = runGate(root);

    expect(status).toBe(0);
    expect(stderr).toContain("Tests passed.");
    expect(readFileSync(log, "utf8").split("\n").filter(Boolean)).toEqual([
      "format:check",
      "lint",
      "typecheck",
      "test:unit",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-failing-unit-test} */
  it("blocks with exit 2 when the unit suite fails", () => {
    const root = makeRoot({ installed: true });
    roots.push(root);
    installStubPnpm(root, { failing: true });

    const { status, stderr } = runGate(root);

    expect(status).toBe(2);
    expect(stderr).toContain("BLOCKED: Tests failed.");
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-dependencies-not-installed} */
  it("blocks with exit 2 when dependencies are not installed", () => {
    const root = makeRoot({ installed: false });
    roots.push(root);
    const log = installStubPnpm(root, { failing: false });

    const { status, stderr } = runGate(root);

    expect(status).toBe(2);
    expect(stderr).toContain("pnpm install");
    expect(() => readFileSync(log, "utf8")).toThrow();
  });

  it("does not intercept a command that is not a git commit", () => {
    const root = makeRoot({ installed: true });
    roots.push(root);
    installStubPnpm(root, { failing: true });
    expect(runGate(root, "pnpm build").status).toBe(0);
  });
});
