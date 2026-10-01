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

# No dependencies means no checks can run; refuse rather than pass unchecked (a
# fresh worktree is the usual case).
if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
  echo "BLOCKED: dependencies are not installed. Run 'pnpm install' first." >&2
  exit 2
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

# Unit tests always run: scripts/__tests__ holds the governance tests, so there is
# always a suite. `test:unit`, not `test`: Playwright runs in e2e.yml on every push,
# which also covers hand-typed commits this hook never sees.
echo "Running unit tests..." >&2
if ! pnpm test:unit 2>&1; then
  echo "BLOCKED: Tests failed. Fix tests before committing." >&2
  exit 2
fi
echo "Tests passed." >&2

exit 0
