---
name: phase-review
description: Use when finishing a phase — picking /code-review effort, running it independently, and the PR review flow.
---

# Phase-completion review

- **Effort**: `/code-review high` (phases are large).
- **Independence**: run it in a fresh foreground `general-purpose` Agent, never inline — inline, the phase's author agent judges its own findings. Brief it with the diff vs `main` and the change's proposal, spec deltas and tasks only; it returns findings and edits nothing, the main agent fixes. Re-review after fixes = a new fresh subagent.
- **`ultra` is never suggested.** It is billed; Oleg runs it himself when he decides to.
- **Order after `/opsx:apply`**: subagent review → fix findings → `/opsx:archive` → push → PR to `main` (`gh pr create`). Run it through without waiting to be asked.
