#!/usr/bin/env bash
# Does this shell command run `git commit`? Reads the command on stdin.
# Exit 0 = yes (the caller should gate it), exit 1 = no.
#
# Extracted from pre-commit-tests.sh so the matcher itself is testable without
# running the gate it guards (the gate runs the whole unit suite).
#
# NOT a literal `git commit` substring match: git takes global flags BEFORE the
# subcommand, so `git -c commit.gpgsign=false commit`, `git -C path commit` and
# `git --no-pager commit` all failed that match and silently skipped format /
# lint / typecheck / test — the same class of hole as the truncated-JSON bug the
# caller's own header describes, and it defeated the gate on every commit made
# that way.
#
# Newlines are collapsed first: a heredoc body splits the command across lines and
# grep is line-based. Then a `git` TOKEN must be followed by a `commit` TOKEN.
# This over-triggers on a commit message that happens to contain both words, and
# that is the right way to be wrong — running the checks needlessly is cheap,
# skipping them is not.
#
# That collapse is ALSO what makes this pipeline SIGPIPE-proof, so do not remove it
# while keeping the pipe. `grep -Eq` normally exits on its first matching line, which
# under `pipefail` + `set -e` would kill `tr` with 141 on a command bigger than the
# pipe buffer — and the caller reads any non-zero as "not a commit" and skips the
# whole gate. It cannot happen here: after `tr` there is exactly one unterminated
# line, so no grep can decide before EOF and it therefore drains the pipe. Measured:
# 5 MB matches in 0.25 s with PIPESTATUS `0 0 0`; the same input without the collapse
# gives 141. Pinned in scripts/__tests__/hook-commit-matcher.test.ts.
#
# Do NOT "simplify" this to bash's own `[[ $c =~ $RE ]]`. Same regex, same input:
# the `([^[:space:]]+[[:space:]]+)*` group backtracks catastrophically inside a long
# unbroken token (a heredoc body), and a 5 MB command ran >120 s against grep's
# 0.25 s. This hook runs on every Bash call; a hang here is worse than what it guards.
set -euo pipefail

COMMAND=$(cat)
printf '%s' "$COMMAND" | tr '\n' ' ' |
  grep -Eq '(^|[[:space:];&|(])git[[:space:]]+([^[:space:]]+[[:space:]]+)*commit([[:space:]]|$)'
