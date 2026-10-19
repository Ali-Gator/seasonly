## Why

Two pages claim more than the product does. `/sample-report` and `/color-analysis-gpt-alternative` drape the sample face in Soft Autumn colors, but the analysis core reads that face Deep Autumn, so a visitor who runs the same photo sees another season (BL-101). The GPT-alternative page says the phone checks a photo for "filters", while the photo guide's own beauty-filter example passes the check: the check only catches strong color filters (BL-100).

The citation gate still fails open in two rename corners. A rename onto a name the same delta frees (A to B, then C to A) leaves A proven by its old scenarios, which archive moves under B (BL-97). A rename archive aborts on (its new name already held, or a held name folding onto its old name) leaves the delta's other entries for those names citable as if it applied (BL-98). Underneath, the rename chain is followed in two places (BL-99).

## What Changes

- **BL-101:** a caption under the sample face's draping pair on both pages: "An AI-made example face, to show how draping looks. These colors are not her analyzed result." The Soft Autumn sample, its banner and every palette stay as they are (canvas v62).
- **BL-100:** the GPT-alternative page's photo-check line says "strong color filters" instead of "filters" (canvas v62). The example photo, the photo check and launch clip 07 stay. Triage logs the missing beauty-filter detection as BL-102, gated on labeled beauty-filtered photos.
- **BL-99:** `appliedRenames` returns each produced name's whole rename chain, and `nearMisses` and `deltaProof` read it instead of rebuilding the chain from the pairs. No gate output changes.
- **BL-98:** a rename archive aborts on makes nothing citable or exempt for its old name, its new name or the folded held name, and the chains ending at them count as not applied, as a removal near-miss does today.
- **BL-97:** a main-spec name that a rename of the same delta writes another requirement over is proven only through the moved block's scenarios or its heading, and takes the moved block's unenforced flag.

## Members

| Id     | Title                                                                     | Lane                                                             |
| ------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| BL-101 | The sample report drapes its model in a season the core does not give her | B — caption chosen; C — canvas v62 approved (Oleg, 2026-10-18)   |
| BL-100 | The photo check passes the photo guide's own filter example               | B — narrow the claim; C — canvas v62 approved (Oleg, 2026-10-18) |
| BL-99  | Rename chains are followed in two places                                  | B — gate helper edit approved (Oleg, 2026-10-18)                 |
| BL-98  | A rename near-miss that archive aborts on stays citable                   | B — gate helper edit approved (Oleg, 2026-10-18)                 |
| BL-97  | A rename onto a freed name keeps the old body's scenarios as its proof    | B — gate helper edit approved (Oleg, 2026-10-18)                 |

Selection: no argument, pass 1. These five were the only `open` items in `docs/backlog.md`; every other item is `gated` or `deferred` on a trigger that has not fired, so pass 2 did not run.

Triage found that two branches both took BL-95 and BL-96 on 2026-10-17. The camera branch's BL-95 (still deferred) and BL-96 (shipped in `backlog-13`) keep their ids, which match their commits; the marketing pair became BL-100 (filter example) and BL-101 (sample report), and `_Next id:_` moved to BL-102; logging BL-102 moved it to BL-103.

## Parked

_None._ No investigated item is lane D. Triage logged one new item, not a member: BL-102 (beauty filters pass the photo check; `gated` on labeled beauty-filtered photos or an approved eval variant).

## Base branch

`origin/main` at `e13386f` (`launch-step-7` merged). It carries BL-97 to BL-99, the colliding BL-95/BL-96 pair and `_Next id:_ BL-100`.

## Approved test edits

- **BL-99, BL-98, BL-97** (design.md Decisions 3–5): helper code and JSDoc in `scripts/__tests__/spec-citations.test.ts`, plus new rule `it`s. No existing `it`'s assertion, fixture or call changes.
- **BL-101, BL-100:** new assertions only, in new `it`s. No existing test changes.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `site-content`: two added requirements — the sample face is labeled an example, and the GPT-alternative page names only the filters the photo check catches.
- `spec-workflow`: "Citations are gated at every commit" — a rename archive aborts on makes nothing it names citable or exempt, and a name a rename writes another block over is proven through that block.

## Impact

- `apps/web/src/app/(site)/sample-report/page.tsx`, `apps/web/src/app/(site)/color-analysis-gpt-alternative/page.tsx`, and new `it`s in `apps/web/src/lib/site-content/content.test.tsx`.
- `scripts/__tests__/spec-citations.test.ts` (approved). No package, route or CI file changes.
- `openspec/specs/site-content/spec.md` and `openspec/specs/spec-workflow/spec.md` through the deltas.
- `docs/backlog.md`: BL-97 to BL-101 are deleted when they ship. Triage renumbered BL-100/BL-101 and logged BL-102.
