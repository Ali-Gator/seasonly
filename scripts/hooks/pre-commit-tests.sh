#!/usr/bin/env bash
# PreToolUse hook for Bash — runs lint, format check, type check and tests before git commit.
# Receives tool input JSON on stdin. Exit 0 = allow, exit 2 = block.

set -euo pipefail

INPUT=$(cat)

# Extract the command with a REAL JSON parser. The previous substring grep
# (`"command"..."[^"]*"`) stopped at the first escaped quote in the payload, so any
# compound command carrying a quoted string before `git commit` — `echo "staged" &&
# git commit -m x`, `pnpm build | grep "ok" && git commit ...` — extracted a
# truncated string, failed the `git commit` match, and silently skipped format /
# lint / typecheck / test entirely.
COMMAND=$(printf '%s' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',d).get('command',''))" 2>/dev/null || true)

# No python3, or an unparseable payload: fall back to the raw JSON. JSON escaping
# never breaks up the `git` and `commit` tokens the matcher looks for, so this still
# matches. It can over-trigger (a commit message quoting them), and that is the right
# way to be wrong — running the checks needlessly is cheap, skipping them is not.
if [[ -z "$COMMAND" ]]; then
  COMMAND="$INPUT"
fi

# Only intercept git commit commands. The matcher lives in its own script so it
# can be unit-tested without running this gate (which runs the whole unit suite).
if ! printf '%s' "$COMMAND" | bash "$(dirname "$0")/is-git-commit.sh"; then
  exit 0
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Check if node_modules exist
if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
  exit 0
fi

cd "$PROJECT_ROOT"

# Run formatter check
echo "Checking formatting..." >&2
if ! pnpm format:check 2>&1; then
  echo "BLOCKED: Formatting issues found. Run 'pnpm format' to fix." >&2
  exit 2
fi
echo "Formatting OK." >&2

# Run linter
echo "Running linter..." >&2
if ! pnpm lint 2>&1; then
  echo "BLOCKED: Lint errors found. Fix them before committing." >&2
  exit 2
fi
echo "Lint OK." >&2

# Run type check
echo "Running type check..." >&2
if ! pnpm typecheck 2>&1; then
  echo "BLOCKED: Type errors found. Fix them before committing." >&2
  exit 2
fi
echo "Types OK." >&2

# Run unit tests (only if test files exist).
#
# `test:unit`, not `test`: Playwright runs in .github/workflows/e2e.yml on every push,
# which also covers hand-typed commits this hook never sees. `pnpm test` stays the
# manual phase-completion gate.
#
# The probe scans every workspace root that holds tests. In runtrip-v2 it scanned
# `src/` only; a workspace has no root `src/`, so that probe would find nothing and
# skip the suite on every commit.
#
# `-print -quit`, not `| head -1`. The pipe version stopped the gate dead: `head`
# exits after the first line, `find` keeps writing into a closed pipe, takes SIGPIPE,
# and `set -o pipefail` + `set -e` turn that 141 into the script's own exit status.
# 141 is not 2, so Claude Code reads it as a non-blocking error and allows the commit
# with the unit suite silently skipped. `|| true` covers find's other non-zero exit
# (a root that does not exist). Pinned in scripts/__tests__/hook-precommit-unit-gate.test.ts.
TEST_FILES=$(find "$PROJECT_ROOT/apps" "$PROJECT_ROOT/packages" "$PROJECT_ROOT/scripts" \
  -name node_modules -prune -o \( -name "*.test.*" -o -name "*.spec.*" \) -print -quit 2>/dev/null || true)
if [[ -n "$TEST_FILES" ]]; then
  echo "Running unit tests..." >&2
  if ! pnpm test:unit 2>&1; then
    echo "BLOCKED: Tests failed. Fix tests before committing." >&2
    exit 2
  fi
  echo "Tests passed." >&2
fi

exit 0
