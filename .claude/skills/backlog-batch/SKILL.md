---
name: backlog-batch
description: Triage `docs/backlog.md` items into a fully planned, fix-ready OpenSpec change named `backlog-<n>` — importance-and-ease selection (or a theme / id list), read-only investigator fan-out, four lanes (A autofix, B decision, C design, D parked), every question, test-edit approval and canvas design resolved in-session, then proposal → spec deltas → design → tasks with `openspec validate` green. Also sweeps gated and deferred items when nothing easy and important is open. Use when picking up backlog work, when the user says "/backlog-batch", names a theme to batch, or gives a list of `BL-nn` ids.
---

# `/backlog-batch` — triage and plan a batch

The planning half of the backlog pipeline, wrapped around the OpenSpec **propose** flow. Takes
`docs/backlog.md` bullets to a change directory that `/backlog-fix` can execute **without asking
Oleg anything**: every decision answered, every edit to an existing test approved, every design
approved on the canvas, every spec delta and task written, `openspec validate --changes` green.

**This command never edits code and never spawns a code-editing subagent.** It writes only
`docs/backlog.md` (ids, status corrections), the change directory, and — with Oleg's yes — the
MVP design canvas.

```
/backlog-batch            planning (this skill)          /backlog-fix backlog-<n>  execution
  1 select                                                 0 assert fix-ready
  2 investigate (parallel, read-only)                      a verify deltas
  3 lanes A/B/C/D, status corrections                      b tests, then code (serial)
  4 resolve B (ask Oleg) and C (canvas design)             c verify
  5 openspec: new change, proposal, specs, design, tasks   d delete shipped bullets
  6 validate green, commit, hand off                       e review
                                                           f archive, PR, auto-merge
```

A batch is named `backlog-<n>` and has **no Tracker row** —
{@link openspec/specs/spec-workflow/spec.md#requirement-a-change-is-tied-to-its-tracker-row}.
Git and the archived change record what it shipped.

## Argument

- **none** — `/backlog-batch`. Selection by importance and ease, with a gated/deferred sweep as
  the fallback. See step 1.
- **a theme word** — `/backlog-batch privacy`. Match the word against bullet text, `_Refs:_`
  paths and the enclosing `##` section.
- **an explicit id list** — `/backlog-batch BL-12 BL-31 BL-33`. Use exactly those, in that order,
  whatever their status.

## Step 1 — select, and say what you picked before anything else

### Parsing rules — apply them to every mode

- Read `docs/backlog.md` whole. A bullet starts at `^- \*\*\[BL-` and runs to its `_Refs:_` /
  `_Status:_` line.
- **Skip the fenced shape example in the header** — it is `[BL-nn]`, a template, not an item, and
  its `_Status:_ open | gated — <blocker> | deferred — <trigger>` line matches a naive open
  filter. Only `[BL-` followed by digits is an item.
- **Match the status word, not a substring of the line.** Statuses read like
  `open — found in t6-eval-set, 2026-10-09` or `deferred — until Sentry shows …`, and the status
  can wrap onto the next line. Only a status whose first word is `open` is open; `gated` and
  `deferred` likewise.
- Any bullet without an id gets the number on the `_Next id:_` line in the backlog header, and
  you bump that line by one. **Never `max(BL-nn) + 1`** — shipped bullets are deleted, so the
  highest id present drops below ids already used. Write the id into the bullet and the bumped
  counter into the header before continuing.
- Skip any item already a member of an unarchived change (`openspec list --json`, then grep the
  open changes' `proposal.md` for the id).

### No argument — importance and ease first

**Pass 1, open items.** Rank every `open` item by importance, then ease, from the bullet text,
its section and its `_Refs:_`:

- **Importance:** a user-visible defect (wrong season or colors shown, lost photo or report, a
  broken flow); then privacy, legal and listing problems (`## Privacy`, chat-plugin directory
  review); then money or spend exposure (AI Gateway, Resend, Vercel usage); then anything that
  must hold for the launch; then internal correctness and test gaps; polish last.
- **Ease:** a named file and a stated fix beat an open-ended investigation; one capability beats
  several.

Do not build a scoring rubric — this is a cheap first cut. The investigator's lane verdict in
step 2 is the real answer, and it will move items.

Drop from pass 1 anything whose own text says it is a watch task, a wait-for-data task (eval
photos still to collect, prod events still to accumulate), or a fix that was offered and
declined — those belong to pass 2. If pass 1 leaves at least one candidate, take the top of the
ranking — enough to land 3–5 fixes (see Batch size) — and go to step 2.

**Pass 2, cleanup — only when pass 1 is empty.** Sweep `gated` and `deferred` items too: the
backlog has to be cleaned up eventually, and an item nobody re-reads never leaves. Take them by
section, the first section with unswept items first, enough to land 3–5 fixes. Step 2 re-checks
each one's gate or trigger against current evidence rather than trusting the line.

### Batch size — 3 to 5 fixes, mandatory

Every batch plans **3–5 fixes**: members that end in lane A, B or C. Retire members and parked
lane-D items do not count toward it.

- **Floor 3.** Investigate enough candidates to land at least three fixes — lane-D items drop
  out in step 3 and "not now" answers in step 4, so take more than three into step 2 (pass 2
  especially). Fall short after step 3 or step 4 → go back to step 1 for the next candidates and
  investigate those, before planning anything.
- **Ceiling 5.** More than five fixable → keep the top five by the step-1 ranking. The rest stay
  in the backlog untouched; they wait for the next batch. Serial fixing makes a long batch slow.
- **Fewer than 3 only with Oleg's explicit approval.** When the candidates are exhausted (theme
  or id list too narrow, every remaining item parked, backlog empty), stop before step 5 and ask
  with `AskUserQuestion`: the fixes found, every candidate investigated and why each could not be
  picked, and the options — plan the short batch, or widen the pool (another theme, pass 2, more
  ids). Proceed short only on a clear yes, and record it in `proposal.md`
  (`**Short batch:** approved by Oleg, <date> — <why no more could be picked>`). Never pad the
  batch with a retire or an invented item to reach three.

Prefer one capability per batch, so the spec deltas and the review have a through-line — but
under no argument, importance beats a tidy theme.

### Announce

Print the picked list — `BL-nn` + title + section + status, one per line — the mode (theme, id
list, pass 1 or pass 2), and what was skipped and why. Do this **before** spawning anything.

Batch name: `backlog-<n>`, `<n>` the next free number across `openspec/changes/` and
`openspec/changes/archive/` (strip the archive's date prefix). A theme batch may add a slug:
`backlog-<n>-<theme>`. Any other shape fails the unit suite.

**Note which branch the backlog you just read lives on** — it goes into `proposal.md`.
`/backlog-fix` deletes the shipped bullets **by id**, so it has to branch from a commit that
carries those ids. Usually that is `main`; it is not when an earlier change that logged them is
still unmerged.

## Step 2 — investigator fan-out, parallel, read-only

One subagent per member, **all spawned in a single response** so they run concurrently.

- Agent type: **`Plan`** (built-in). Triage is a judgment call — is it still real, what is the
  root cause, is the bullet's own fix right, which lane — and `Plan` reads code and reasons about
  trade-offs with **no Edit/Write tools**. It keeps Bash for `git log`, `grep` and read-only
  queries — Bash can still write, so the prompt must still say read-only.
- **Read-only, no exceptions.** Investigation is the only parallel phase in the pipeline, and it
  is only safe because nothing in it writes: subagents share one working tree.
- Give each one the bullet verbatim, its `_Refs:_` paths, and this return contract:

  ```
  Read-only: do not edit, write, commit, install, or run paid scripts (pnpm test:smoke,
  pnpm eval:vision, anything that calls AI Gateway or Resend).
  Return ONLY:
  - still real? Verify the defect or gap exists in the current code. If it is already fixed or
    the code it names is gone, say "obsolete" with the evidence and stop.
  - root cause, in one or two sentences
  - the file:line sites that would have to change
  - blast radius: every caller/route/spec/test that touches those sites
  - the capability whose spec governs it (openspec/specs/README.md maps paths to capabilities)
  - whether the fix needs an EXISTING test changed (not just a new one), and which
  - readiness — exactly one of:
    A  fixable now, no input needed
    B  fixable once Oleg makes a decision — state the choice, the options, and which you'd pick
    C  fixable once a visual design exists on the MVP canvas — state what has to be drawn
    D  NOT fixable yet — it needs data, prod evidence, elapsed time, or an external party
       (name which); no answer or design from Oleg would unblock it
  - for a gated/deferred item: is its named gate/trigger met now? What evidence did you check?
  Do not propose a diff. Do not paste file contents.
  ```

**The question every verdict answers: could this be fixed today if Oleg answered a question or a
design were drawn?** Yes → A, B or C, and the batch resolves the input itself. No → D.

For a gate or trigger that names prod data (Sentry issues, PostHog events, Supabase rows, Vercel
usage), the investigator reads that data read-only where an MCP tool reaches it; otherwise it
reports the trigger as unverified, which is D.

## Step 3 — lanes and backlog corrections

Sort every member into a lane. Treat verdicts as evidence, not orders — re-read the bullet
against the verdict and overrule where the investigator was wrong.

| lane       | meaning                                       | outcome in this batch                           |
| ---------- | --------------------------------------------- | ----------------------------------------------- |
| **A**      | fixable now                                   | planned                                         |
| **B**      | needs Oleg's decision                         | resolved in step 4, then planned                |
| **C**      | needs a visual design                         | resolved in step 4, then planned                |
| **D**      | needs data / time / a third party             | parked: stays in the backlog, not in the change |
| **retire** | obsolete — already fixed, or its code is gone | planned as a delete-only member                 |

**A fix that has to change an existing test is lane B, never A** — CLAUDE.md makes every edit to
an existing test Oleg's call. New tests need no approval.

**A UI change whose look is already on the approved canvas is lane A**, not C — the canvas is
the source of truth for layout and copy. Lane C is for a state or screen the canvas does not
show.

Then correct `docs/backlog.md` so the file stops lying, **for every member whatever its lane**:

- a D item marked `open` becomes `gated — <blocker>` or `deferred — <trigger>`, naming the
  concrete thing it waits for
- a gated/deferred item whose trigger has fired becomes `open`, and joins the batch in its lane
- a D item whose blocker text is stale gets the current blocker

These are status-line edits only. **Never delete a bullet here**, retire lane included —
deletion happens in the fix lane, inside the reviewed diff.

**If no member is in A, B, C or retire, create no change.** Commit the status corrections
(`docs(backlog): …`). Under no argument, go back to step 1 for the next candidates — the rest of
pass 1's ranking, then pass 2 — until a batch has a fixable member or every item has been swept
this run; with a theme or id list, stop. Print what was parked and why. **No change
directory** — an empty change fails validate, and inventing a requirement or setting
`skip_specs` to silence it is worse. This is the common outcome of a pass-2 sweep, not a failure.

**Fewer than 3 fixes (A/B/C)** — top up per Batch size: commit the status corrections, go back
to step 1 for more candidates, and ask Oleg before planning a short batch.

## Step 4 — resolve every B and C now

Nothing reaches the plan with an open question. This is the part of the pipeline that needs
Oleg, so it all happens here, in one sitting, rather than being left for `/backlog-fix`.

### Lane B — decisions (including existing-test edits)

1. Write the decision blocks first, into a scratch copy of what will become `design.md`'s
   `## Decisions` section — one numbered block per decision:
   - the id and what the decision is
   - the options, at least two, concretely stated
   - the trade-off between them
   - **a recommendation**, with its reason
   - an `**Answer:**` line
2. For an existing-test edit, the decision names the file, the test, and what changes in it and
   why (the old assertion pins behavior the fix changes on purpose, or the test is wrong).
3. Ask with `AskUserQuestion` — the recommended option first, labelled `(Recommended)`, the
   trade-off in the option descriptions. **Four questions per call at most**; a batch with more
   takes several calls. One item can carry several decisions.
4. Transcribe each answer into its `**Answer:**` line with `(Oleg, <date>)`. The file is the
   record; chat does not survive a compaction or a new session.
5. An answer that opens a new question — ask it now too. An answer of "not now" or "needs data
   first" moves the item to lane D (status corrected per step 3).

### Lane C — designs, on the MVP canvas

Designs live on the approved MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3),
built from the Seasonly design system — not in repo files. CLAUDE.md requires Oleg's approval of
a canvas design before code that implements it. Read the `mvp-design-canvas` memory first: it
holds the canvas's current version, row layout and publishing gotchas.

For each item, write what has to be drawn: the board (new, or which existing one changes), the
states, 375 and 1280 widths, light and dark where the board has both, and the copy. Then:

1. Ask Oleg with `AskUserQuestion` whether the canvas may be edited in place for these boards
   (**agent draws it — recommended**) or whether he draws it himself.
2. **Agent draws it:** edit the canvas in place (a bare `read` of the canvas first, per the
   memory), one item at a time, then show Oleg the boards and get a yes — or feed his changes
   back and redraw. **Oleg draws it:** print the brief as one copy-pasteable block and wait.
3. Record in `design.md`, per item: the board names, the canvas version, and
   `**Approved:** Oleg, <date>`. Update the `mvp-design-canvas` memory with what changed.

A design Oleg cannot approve in this sitting moves the item to lane D.

## Step 5 — plan the change (the OpenSpec propose flow)

Only now, with every member resolved, create the change. This step **is** the `openspec-propose`
flow, run inline with backlog content — do not invoke that skill: its planning boundary stops
for a new user request, which fights this flow.

```bash
openspec new change backlog-<n>
openspec status --change backlog-<n> --json
```

**Never hand-create the change directory** — the CLI writes the schema marker and the layout
that `openspec status` and the CI validate gate read.

Create the artifacts in the dependency order `status` reports. For each one that is `ready`:

```bash
openspec instructions <artifact-id> --change backlog-<n> --json
```

Use its `template` as the structure and `resolvedOutputPath` as the path; apply `rules` and
`context` as constraints without copying them in. Re-run `status` after each artifact.

- **`proposal.md`** — Why, What Changes, Capabilities, Impact, plus:
  - a **Members** table: every `BL-nn`, its title and lane
  - **Parked**: every lane-D item investigated, and what it is waiting for
  - **Base branch**: the branch whose backlog triage read
  - **Approved test edits**: each existing test the batch may change, pointing at its decision
- **spec deltas** — `specs/<capability>/spec.md` for every capability the A, B and C members
  change, the answered decisions and the approved designs written down as requirements with
  scenarios. A changed requirement is `## MODIFIED` with its **whole** text and every scenario
  (archive replaces it wholesale); new scenarios inside it are citable before archive.
  **A capability touched for the first time uses `## ADDED Requirements`, never `MODIFIED`.**
  A brand-new capability's `openspec/specs/README.md` row is added at archive, not now — until
  its permanent spec exists, the row would block every edit to its paths. Retire members need no
  delta.
- **`design.md`** — the lane table (every member, including D, and one line of why); per member
  the change in one paragraph and its files; `## Decisions` with every answered block; the
  approved canvas boards for lane C; and any correction to what a bullet claims (bullets are
  sometimes wrong about their own fix — record the evidence).
- **`tasks.md`** — the list `/backlog-fix` executes, one task group per member (split a member
  that touches two capabilities), in this shape:

  ```
  ## 1. Spec deltas
  - [x] 1.1 <capability> delta — written in triage
  ## 2. Fixes — one subagent at a time, serially
  - [ ] 2.1 BL-nn — failing test for <behavior> ({@link openspec/specs/<capability>/spec.md#<scenario>})
  - [ ] 2.2 BL-nn — <change>, files <paths>, until 2.1 passes
  ## 3. Verify, delete, review, archive, ship
  - [ ] 3.1 pnpm fix, pnpm test
  - [ ] 3.2 delete shipped bullets <ids> from docs/backlog.md
  - [ ] 3.3 /code-review high in a fresh subagent; fix, log the rest as new BL items
  - [ ] 3.4 archive (/opsx:archive flow, no Tracker)
  - [ ] 3.5 preflight, push, PR, auto-merge
  ```

  Tests come before code in every fix group — the repo's spec → tests → code order. A task that
  edits an existing test says so and names its decision.

If writing a delta turns up a choice nobody made, it is a lane-B decision: go back to step 4 and
ask it now. Do not leave it for the fix lane.

A batch whose whole diff is exempt paths (CLAUDE.md "Exempt from the spec hook") — retire-only,
typically — sets `skip_specs: true` in `.openspec.yaml` and writes no delta. Anything touching
`apps/*/src/` outside `components/ui/` or `packages/*/src/` does not qualify.

## Step 6 — gate, commit, hand off

```bash
openspec status --change backlog-<n> --json     # every artifact done
openspec validate --changes                     # green
```

Both green before handing off — **validate is green at the end of triage.** A red validate here
means the plan is incomplete; fix it now.

Branch `backlog-<n>` from the base branch, and commit the change directory and the backlog
corrections together (`docs(openspec): triage backlog-<n>`, `/caveman-commit` for the message).
Then print:

```
backlog-<n> — planned, fix-ready. N members, M parked.

  BL-nn  A       <title>
  BL-nn  B       <title>   decided: <answer, short>
  BL-nn  C       <title>   design: canvas v<version>, board <name>
  BL-nn  retire  <title>

Parked (status corrected in docs/backlog.md):
  BL-nn  <title>  — waits for <data / time / party>

Run:  /backlog-fix backlog-<n>
```

Then stop. `/backlog-fix` is a separate invocation.

## Never

- Never spawn a subagent that can write the repo. Canvas edits happen in this agent, one item
  at a time, after Oleg's yes.
- Never run investigators serially "to be safe" — read-only work is the one thing that is safe
  in parallel here.
- Never hand off a batch with an unanswered decision, an unapproved existing-test edit, an
  unapproved design, a missing delta, or a red validate. What cannot be resolved now is lane D,
  not a question for `/backlog-fix`.
- Never plan fewer than 3 or more than 5 fixes. Under 3 needs Oleg's explicit approval, asked
  with the reason no more could be picked and recorded in `proposal.md`.
- Never delete a backlog bullet here — deletion happens in the fix lane, inside the reviewed diff.
- Never add a Tracker row or log line for a backlog batch.
- Never run a paid script — `pnpm test:smoke`, `pnpm eval:vision`, or anything that calls AI
  Gateway or Resend — at any step. Oleg approves every paid run himself.
