## Why

Backlog fixes have no home in the Tracker: every change must be named `t<N>-<slug>`, so a bug batch either borrows an unrelated phase's row (`t12-tool-title-annotation` fixed BL-36) or needs a Tracker row nobody wants. Git and the specs already record what a fix shipped. Oleg's call, 2026-10-11: backlog batches skip the Tracker.

Fixing bugs from `docs/backlog.md` is also done by hand each time. runtrip-v2's `/backlog-batch` (triage into a fix-ready change) and `/backlog-fix` (ship it) make it mostly automatic; this change ports them.

## What Changes

- A change may also be named `backlog-<n>[-<slug>]`, for a batch of backlog fixes. It has no Tracker row, and archiving it does not touch the Tracker.
- New project skills `.claude/skills/backlog-batch/` and `.claude/skills/backlog-fix/`, adapted to Seasonly's rules: `{@link}` citations, approval for edits to existing tests and for canvas designs, no paid runs, unfixed review findings logged as new `BL-nn` items, PR with auto-merge (merge commit) instead of a push to `main`.
- The citation gate resolves anchors inside a change's `## MODIFIED` requirements before archive, not only `## ADDED` ones. Backlog fixes mostly modify existing requirements; without this, a test citing a new scenario blocks every commit until archive.
- The archive skill and `/opsx:archive` skip the Tracker step for `backlog-*` changes.

## Capabilities

### Modified Capabilities

- `spec-workflow`: change names accept `backlog-<n>[-<slug>]`; the Tracker requirements apply to `t<N>` changes only; citations resolve into MODIFIED delta requirements.

## Impact

`scripts/__tests__/spec-mapping.test.ts` and `scripts/__tests__/spec-citations.test.ts` (both edits approved by Oleg, 2026-10-11), `.claude/skills/**`, `.claude/commands/opsx/archive.md`, `CLAUDE.md`, `openspec/config.yaml`. No app code.
