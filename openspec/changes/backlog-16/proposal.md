## Why

The landing's camera link strips `?start=camera` with Next's own history state, so Next's router never learns the new address. A router refresh or a server action on `/analyze` would write the parameter back, and a reload would then reopen the camera. The strip also hard-codes `/analyze`, so any other query parameter or hash on the link is lost (BL-95). The citation gate's `slugify` keeps superscripts and fractions that GitHub drops, so a heading such as "76 px²" would pass the gate and be a dead link on GitHub. That breaks the gate's own requirement: anchors are the slug "as GitHub renders it" (BL-105).

Two deferred privacy items, BL-18 (a crop can live about 49 h) and BL-19 (the PostHog cookie without consent), were put to Oleg again with free fixes. He dropped both: they leave the backlog.

## What Changes

- **BL-95:** after the strip, the flow tells Next's router about the new address through Next's documented native-history integration: a `replaceState` with the flow's own state, without Next's keys, once Next has patched history. The stripped address keeps the path, every other query parameter and the hash. The immediate strip that keeps Next's state stays, so Back on a fresh load still does not reload the page.
- **BL-105:** `slugify` keeps decimal digits and letter numbers (`\p{Nd}\p{Nl}`) instead of every number (`\p{N}`), as github-slugger 1.5.0 does. ², ³, ½ and ¼ drop out of anchors; Ⅻ stays.
- **BL-18, BL-19:** delete-only. The data-retention spec's edge case stops pointing at BL-18.

## Members

| Id     | Title                                                              | Lane                                                       |
| ------ | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| BL-95  | The camera start leaves Next's router on `?start=camera`           | B — fix before its trigger approved (Oleg, 2026-10-20)     |
| BL-105 | The gate's `slugify` keeps superscripts and fractions GitHub drops | B — gate-file edit approved, Decision 3 (Oleg, 2026-10-20) |
| BL-18  | A crop can stay about 49 h while the pages say 24 h                | retire — dropped by Oleg, Decision 1 (2026-10-20)          |
| BL-19  | The PostHog cookie is set without consent                          | retire — dropped by Oleg, Decision 2 (2026-10-20)          |

**Short batch:** approved by Oleg, 2026-10-20 — pass 1 found no open item; the pass-2 sweep found every other gated or deferred item waiting on data, a date or a third party, and Oleg dropped BL-18, BL-19 and the new BL-106 rather than fix them.

Selection: no argument. Pass 1 was empty (no `open` item). Pass 2 investigated nine items: BL-102, BL-51, BL-104, BL-18, BL-19, BL-95, BL-105, BL-27, BL-28. Not investigated, with the reason:

- BL-13, BL-39, BL-50: `evals/manifest.json` has not changed since 2026-10-16 (180 photos); each waits for more labeled people.
- BL-49: still 1 of 4 clean weekly runs; the next is due 2026-10-26.
- BL-02, BL-04, BL-33: re-checked in `backlog-15` triage on 2026-10-19.
- BL-32, BL-34, BL-54: wait on funnel data, the directory listing and TikTok followers; nothing has changed.

**BL-106** was logged in this triage (Oleg's own sessions cannot be left out of PostHog counts: the internal cohort is empty and nothing identifies a person) and dropped by Oleg in the same sitting. It never reached `main`; the id stays used, and `_Next id:_` reads BL-107.

## Parked

Statuses corrected in `docs/backlog.md`:

- **BL-102** (beauty filters pass) waits for labeled real beauty-filtered photos. The "approved synthetic variant" branch is gone: a detector fitted to our own transform measures only that transform.
- **BL-51** (squint passes unmeasured) waits for about 50 production `photo_checked` events; still 9, none since 2026-10-18, counted by host only.
- **BL-104** (tune the 3 s segmenter wait) waits for about 50 production passes with the outline outcome; 0 so far, no `photo_checked` since the BL-68 deploy.
- **BL-27** (GPT page tense) waits for December 11, 2026, still OpenAI's date; Enterprise workspaces retire February 11, 2027.
- **BL-28** (two redirect hops) waits for inbound links, which only Search Console or Vercel request logs can show.

## Base branch

`origin/main` at `6868e11` (`backlog-15` merged). It carries BL-18, BL-19, BL-95 and BL-105, and `_Next id:_ BL-106`. Triage used BL-106 and moved the counter to BL-107.

## Approved test edits

- **BL-105** (design.md Decision 3): helper code and its JSDoc in `scripts/__tests__/spec-citations.test.ts` (`slugify`), plus one new rule `it`. No existing `it`'s assertion, fixture or call changes.
- **BL-95:** new tests only. No existing test changes.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `capture-flow`: "The landing's camera link opens the flow on the camera" keeps every other part of the address and requires Next's router to hold the stripped address.
- `spec-workflow`: "Citations are gated at every commit" says which numbers an anchor keeps.

## Impact

- `apps/web/src/app/(flow)/analyze/flow.tsx` (the mount-only strip effect), new tests in `flow.dom.test.tsx` and `e2e/analysis-flow.spec.ts`.
- `scripts/__tests__/spec-citations.test.ts` (`slugify` and one new `it`).
- `openspec/specs/capture-flow/spec.md` Behavior bullet and `openspec/specs/data-retention/spec.md` edge case, edited directly after archive.
- `docs/backlog.md`: BL-18, BL-19, BL-95, BL-105 deleted.
