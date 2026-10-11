---
name: backlog-fix
description: Execute a `backlog-<n>` batch that `/backlog-batch` planned — the OpenSpec apply and archive flows around the backlog pipeline: assert fix-ready, verify deltas, tests then code with one editing subagent at a time, `pnpm fix` / `pnpm test`, delete shipped bullets, `/code-review high` in a fresh subagent, archive without the Tracker, then a preflight, a PR to `main` and auto-merge with a merge commit. Use when the user says "/backlog-fix", names a batch to ship, or asks to implement a batch `/backlog-batch` already triaged.
---

# `/backlog-fix backlog-<n>` — execute a planned batch

The execution half of the backlog pipeline, wrapped around the OpenSpec **apply** and
**archive** flows. Takes the change `/backlog-batch` planned — every decision answered, every
existing-test edit approved, every design approved on the canvas, every delta and task written,
validate green — and ships it. **It asks Oleg nothing about the batch's content**; if it has to,
triage was incomplete (see step 0).

Seven steps, in order, no reordering: **(0)** assert fix-ready, **(a)** verify the deltas,
**(b)** tests then code, serially, **(c)** verify, **(d)** delete the shipped bullets,
**(e)** review, **(f)** archive, preflight, PR.

The deletion sits **before** the review, so the bullets leaving `docs/backlog.md` are inside the
diff the reviewer reads. The archive sits **before** the push, so the specs fold into
`openspec/specs/` in the same PR as the code they describe.

**The terminal state is a PR to `main` with auto-merge on (merge commit, never squash).** `main`
merges once the `check`, `e2e` and `validate` checks pass, and merging deploys production.

## Step 0 — assert the batch is fix-ready

`/backlog-batch` hands off only a fully planned change, so this is a cheap assertion, not a
routine gate. Run:

```bash
openspec status --change backlog-<n> --json        # every artifact done
openspec validate --changes                        # green
openspec instructions apply --change backlog-<n> --json
```

and read `openspec/changes/backlog-<n>/design.md`. Block if any holds:

- an artifact not `done` (or `skipped` under `skip_specs`), or `instructions apply` reports
  `state: "blocked"`
- validate is red, or `openspec validate --changes 2>&1 | grep -i 'archive would refuse'` prints
  anything (validate exits 0 on a MODIFIED heading that matches nothing; archive would refuse it)
- a `**Answer:**` line under `## Decisions` is empty
- a lane-C member has no `**Approved:** Oleg, <date>` line naming its canvas boards and version

On a block, the fix is to finish triage, not to start around it: say what is missing, and
resolve it the way `/backlog-batch` step 4–5 would — ask the decision with `AskUserQuestion`,
get the design approved, and fold the result into the artifacts with the
`openspec-update-change` flow — then re-run step 0. Do not start a partial batch "meanwhile".

Green: check out branch `backlog-<n>` (triage created it, from the commit that carries the
batch's ids — not reflexively from `main`). Step (d) deletes the shipped bullets by
`BL-nn`, so a branch whose `docs/backlog.md` predates those ids has nothing to delete. The
batch's `proposal.md` names the base branch. Check before starting:

```bash
grep -c '\[BL-12\]\|\[BL-31\]' docs/backlog.md    # the batch's ids; 0 means wrong base
```

## Step (a) — verify the deltas before any code edit

Triage wrote the deltas. Confirm that for every A, B and C member its delta exists at
`openspec/changes/backlog-<n>/specs/<capability>/spec.md`, and that each scenario a task's test
will cite is in it (or already in the permanent spec).

A gap here is a triage miss: write the missing delta now (the `openspec-update-change` flow),
and if writing it requires a choice nobody made, **ask it now** with `AskUserQuestion`,
transcribe the answer into `design.md`, and continue. Only an item that turns out to need data
or time rather than an answer is parked — drop it from the batch, restore its bullet's status,
and remove its delta and tasks.

Re-run `openspec validate --changes`; green, with no "Archive would refuse" line, before step
(b).

## Step (b) — tests, then code, one editing subagent at a time

This is the `openspec-apply-change` flow, with the backlog pipeline's constraints. Work through
`tasks.md` group by group, and for each fix task **in turn**:

1. Spawn **one** `general-purpose` subagent. Its contract, in this order:
   **write the failing test first**, cited at the permanent path
   (`{@link openspec/specs/<capability>/spec.md#<scenario-anchor>}` — the citation gate resolves
   ADDED and MODIFIED delta anchors before archive), confirm it fails for the stated reason,
   **then** change the code until it passes. It may edit an existing test **only** where
   `design.md` records Oleg's approval for that test; anything else it must report back, not do.
   It never runs `pnpm test:smoke`, `pnpm eval:vision`, or anything that calls AI Gateway or
   Resend.
2. **Wait for it to return.** Only then spawn the next.
3. Mark the task's checkboxes in `tasks.md` (`- [ ]` → `- [x]`) once its test passes.
4. Commit between tasks if you like (`/caveman-commit` for the message) — but **never while a
   subagent is live**.

Retire members get no subagent — they only lose their bullet in step (d).

**Why serial, so nobody "optimizes" this into parallel later:** repo-editing subagents share one
working tree. Two running at once interleave their edits into the same files, and neither one's
diff can be trusted; a commit taken while one is live captures half of another item's work.
`isolation: "worktree"` looks right and is worse: a fresh worktree has no `node_modules`, so a
fixer that cannot install cannot typecheck, and `pre-commit-tests` rejects everything it
produces. Throughput inside a batch is ~1 fix at a time, by constraint. Parallelism in this
pipeline lives in triage, where the agents are read-only.

If a task needs work the spec and the answered decision do not describe — or an existing-test
edit nobody approved — stop and ask. Do not narrow it, defer part of it, or absorb the extra
scope silently. Fold the answer into the artifacts (`openspec-update-change` flow) before
continuing, so the archived change matches what shipped.

## Step (c) — verify

```bash
pnpm fix      # prettier --write, eslint --fix, typecheck
pnpm test     # vitest run && playwright test
```

`pnpm test` is the manual phase gate: the pre-commit hook runs only `test:unit`, and nothing
runs Playwright between pushes except CI.

Local Playwright starts `next dev`, which writes `apps/web/.next/dev/types/`, and the web
tsconfig includes that folder. If a commit right after a test run fails `typecheck` on a file
under `.next/dev/types/` (a truncated generated file — seen in runtrip-v2 as `TS1005 '}'
expected` or `TS1160 Unterminated template literal`), delete it and regenerate, then re-run
`pnpm typecheck`:

```bash
rm -f apps/web/.next/dev/types/validator.ts apps/web/.next/dev/types/routes.d.ts && pnpm --filter web exec next typegen
```

## Step (d) — delete the shipped bullets, before the review

Delete each shipped member's bullet from `docs/backlog.md` — retire members included — the whole
bullet, title line through `_Status:_`. That is the backlog's own rule: history lives in git and
in the archived change. Its number **retires with it** and is never reassigned.

**Leave the header's `_Next id:_` line exactly where it is.** This step is the only thing that
lowers the highest id present in the file, so decrementing the counter — or deriving the next id
from `max(BL-nn)` — would hand a shipped item's number to a different item. The counter only
ever goes up.

Do this **before the review**, so the deletion is part of the diff `/code-review` reads. Commit
the deletion here, then review. Verify no shipped id survives:

```bash
grep -n '\[BL-12\]\|\[BL-31\]' docs/backlog.md   # the shipped ids; expect no output
```

A member that did **not** ship — parked in step (a) — keeps its bullet, with its status corrected
to the `gated` / `deferred` blocker it turned out to have. Tick the deletion task in `tasks.md`.

## Step (e) — review the batch branch, in a fresh subagent

Follow the `phase-review` skill: `/code-review high` in a **fresh foreground `general-purpose`
Agent**, never inline — inline, the agent that wrote the batch judges its own findings.

Brief the reviewer with only what defines intent:

- the target: `git diff main...HEAD` on the batch branch, whole branch, not per commit
- the change's `proposal.md`, `design.md` (it records the decisions and approved test edits),
  its spec deltas and `tasks.md`, by path
- the instruction: run `/code-review high` over that diff, return the findings, **edit nothing**
  (one editing agent per working tree — the main agent applies the fixes)

It covers correctness bugs **and** reuse/simplification/efficiency cleanups in one pass, so
`/simplify` is not needed separately. The main agent fixes the findings it can within the
batch's decisions; a finding that would need a new decision or out-of-scope work is logged in
`docs/backlog.md` as a new `BL-nn` (the `_Next id:_` counter, bumped) — CLAUDE.md "Backlog".
Then re-run `pnpm test` (and step (c)'s regenerate line if typecheck trips on `.next/dev/types`).

A re-review after substantial fixes is a **new** fresh subagent, not a `SendMessage` to the old
one — a continued agent keeps its context, and with it whatever it already decided.

## Step (f) — archive, preflight, PR

**Archive first**, on the batch branch, so the specs fold into `openspec/specs/` in the same PR
as the code. Follow the `openspec-archive-change` flow (`/opsx:archive`). A `backlog-<n>` change
has **no Tracker row: skip the Tracker step.** Do re-add Public Interface, Behavior and Edge
Cases and the `openspec/specs/README.md` row for any capability the batch created. Tick the last
task (3.4 — archive, preflight, PR) right before starting the archive flow: the rest of it runs
after the move, and the archive flow warns on any open box. With it ticked, every artifact is
done and every box checked, so its warnings should not fire — if one does, something upstream
was skipped: stop and say what.

Verify the folded specs read right — `openspec list --specs` shows the touched capabilities, and
a stray code fence in a target spec makes archive append inside the fence. Commit
(`chore(openspec): archive backlog-<n>`). The archive commit is mechanical, so it does not
reopen the review.

Then five checks. All five green → PR with auto-merge. Any one red **after one repair attempt**
→ PR **without** auto-merge, and report which check failed.

| #   | Check                                                                                   | On failure                       |
| --- | --------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck` clean                                | fix, re-run                      |
| 2   | `pnpm test` green                                                                       | fix the **code**, never the test |
| 3   | `openspec validate --all --no-interactive` green — what CI's `validate` job runs        | fix the spec or change           |
| 4   | the fresh-subagent review left no finding that is neither fixed nor logged as a `BL-nn` | fix or log it                    |
| 5   | working tree clean (`git status` clean, `git diff` empty) — everything is committed     | commit, or re-review if unseen   |

Green:

```bash
git push -u origin backlog-<n>
gh pr create --base main --title "fix: backlog-<n> — BL-12, BL-31, …" --body "..."
```

The PR body names the shipped (deleted) ids, every `BL-nn` added along the way, and any parked
member with its new status. Then `mcp__ccd_pr__get_status` (bind the PR with `bind_pr` if it is
not reported), and turn on auto-merge with `mcp__ccd_pr__set_auto_merge`,
`merge_method: "merge"` — never squash. Do not poll CI yourself.

Red after one repair attempt: push and open the PR the same way, **auto-merge off**, then
report in one block: which check failed, what the failure was, what the one repair attempt
changed, and the PR link.

## Never

- **Never run a paid script** — `pnpm test:smoke`, `pnpm eval:vision`, or anything that calls AI
  Gateway or Resend — at any step, for any reason. Oleg approves every paid run himself. If you
  believe one is needed, ask and say why. Keeping those suites' _files_ current with the batch's
  behavior is still expected.
- Never run two editing subagents at once, and never commit while one is live.
- Never edit an existing test without Oleg's approval recorded in `design.md`, and never edit a
  test to make it pass.
- Never touch the Tracker for a `backlog-<n>` change.
- Never squash-merge, and never enable auto-merge with a red check.
- Never park, narrow or defer a member because it needs Oleg's answer — ask it and continue.
  Only a member that needs data or time is parked.
