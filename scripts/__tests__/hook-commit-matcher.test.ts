/**
 * The pre-commit gate's command matcher. It is the thing that decides whether
 * format / lint / typecheck / unit tests run at all, so a hole in it is not a
 * missed check — it is every check, silently, on the commits it fails to match.
 *
 * The matcher is its own script precisely so this test can exercise it without
 * running the gate (which runs this very suite).
 *
 * @see scripts/hooks/is-git-commit.sh
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const SCRIPT = "scripts/hooks/is-git-commit.sh";

function isCommit(command: string): boolean {
  try {
    execFileSync("bash", [SCRIPT], { input: command, stdio: ["pipe", "pipe", "pipe"] });
    return true;
  } catch {
    return false;
  }
}

describe("the pre-commit gate's git-commit matcher", () => {
  it("matches a plain commit", () => {
    expect(isCommit('git commit -m "x"')).toBe(true);
  });

  it("matches a commit behind git's GLOBAL flags — the hole that defeated the gate", () => {
    // git takes global flags before the subcommand, so none of these contain the
    // literal substring "git commit" the matcher used to look for. Every commit
    // made this way skipped format, lint, typecheck and the unit suite outright.
    expect(isCommit("git -c commit.gpgsign=false commit -q -m x")).toBe(true);
    expect(isCommit("git -C /some/path commit -m x")).toBe(true);
    expect(isCommit("git --no-pager commit -m x")).toBe(true);
  });

  it("matches a commit inside a compound command", () => {
    expect(isCommit('git add -A && git commit -m "x"')).toBe(true);
    expect(isCommit('pnpm format; git add -A && git -c core.hooksPath= commit -m "x"')).toBe(true);
  });

  it("matches across newlines — a heredoc message splits the command over lines", () => {
    const command = ["git add -A && git commit -F - <<'EOF'", "fix(x): a subject", "", "EOF"].join(
      "\n",
    );
    expect(isCommit(command)).toBe(true);
  });

  it("survives a command far larger than the pipe buffer", () => {
    // The matcher is a `printf | tr | grep -Eq` pipeline under `set -o pipefail`.
    // `grep -q` exiting on its match while `tr` is still writing would kill `tr`
    // with SIGPIPE, make the pipeline 141, and the caller reads ANY non-zero as
    // "not a git commit" — skipping format, lint, typecheck and this suite. The
    // `tr` collapse is what prevents it: it leaves one unterminated line, so grep
    // cannot decide before EOF and drains the pipe. This pins that, well past the
    // 16KB (macOS) / 64KB (Linux) buffer, with the match occurring early.
    const command = [
      "git commit -F - <<'EOF'",
      "fix(x): a subject",
      "y".repeat(100_000),
      "EOF",
    ].join("\n");
    expect(isCommit(command)).toBe(true);
  });

  it("ignores commands that only mention git", () => {
    expect(isCommit("git status --short")).toBe(false);
    expect(isCommit("git log --oneline -5")).toBe(false);
    expect(isCommit("pnpm test")).toBe(false);
  });

  it("does not fire on the word commit without git", () => {
    // Over-triggering is the safe direction, but not to the point of gating every
    // command that says "commit" — the gate runs the whole unit suite.
    expect(isCommit('echo "no commit here"')).toBe(false);
  });
});
