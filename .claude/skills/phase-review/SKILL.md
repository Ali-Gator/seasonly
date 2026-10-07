---
name: phase-review
description: Use when finishing a phase — picking /code-review effort, running it independently, and the PR review flow.
---

# Phase-completion review

- **Effort**: `/code-review high` (phases are large).
- **Independence**: run it in a fresh foreground `general-purpose` Agent, never inline — inline, the phase's author agent judges its own findings. Brief it with the diff vs `main` and the change's proposal, spec deltas and tasks only; it returns findings and edits nothing, the main agent fixes. Re-review after fixes = a new fresh subagent.
- **`ultra` is never suggested.** It is billed; Oleg runs it himself when he decides to.
- **Order after `/opsx:apply`**: subagent review → fix findings → log the findings left unfixed in `docs/backlog.md` (CLAUDE.md "Backlog") → `/opsx:archive` → push → PR to `main` (`gh pr create`), naming the added `BL-nn` ids → auto-merge on that PR via `mcp__ccd_pr__set_auto_merge` with `merge_method: "merge"` (never squash; `main` waits for the `check`, `e2e` and `validate` checks). Run it through without waiting to be asked.
