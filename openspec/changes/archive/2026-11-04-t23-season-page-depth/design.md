## Context

See proposal.md (Why). The season page (`apps/web/src/app/(site)/seasons/[season]/page.tsx`) already renders palette, avoid, neutrals and metals with the report's `ReportSection`, `Group` and `Colors` (`lib/report/sections.tsx`), floated `LEFT` / `RIGHT` from 1024 px. `PALETTES[season]` already holds `lips`, `blush`, `eyes` and `hair`, and `SEASON_COPY[season]` holds `makeupIntro` and `hairTip`; the report renders them as "Makeup and hair". Per-season site copy lives in `lib/site-content/seasons.ts` (`SEASON_CONTENT`). The approved layout is MVP canvas version 76 (boards 16 Season 375 and 1280, copy sheet 16c).

## Goals / Non-Goals

**Goals:**

- One source for the makeup-and-hair markup, used by the report and the season page.
- Outfits stored as palette names, never hex codes, so a renamed palette color breaks a test, not the page.
- No change to `packages/analysis`: the eval cannot move and `results.json` stays fresh.

**Non-Goals:**

- No new design-system component. The canvas uses `ReportSection`, `SwatchGrid` (`Colors`) and an h3 per group, as the metals section does.
- No change to titles, descriptions or the FAQ.

## Decisions

1. **Lift `MakeupAndHair` into `lib/report/sections.tsx`.** The report's block becomes `MakeupAndHair({ season, overline })`, rendering the same `ReportSection` titled "Makeup and hair" with the four `Group`s. The report passes "Section 5 of N" as the overline; the season page passes "Makeup and hair". The report's markup stays byte-identical, so its tests stay green. Alternative: copy the 20 lines into the season page. Rejected: the two would drift, and the spec says they show the same thing.
2. **Outfits are name triples in `SEASON_CONTENT`.** `outfits: readonly [Outfit, Outfit, Outfit]`, where `Outfit = readonly [best: string, neutral: string, metal: string]`, in Everyday, Work, Evening order. A helper `seasonOutfits(slug)` in `lib/site-content/seasons.ts` resolves each name in `PALETTES[season].best`, `.neutrals` and `.metals` and throws on a miss, then builds the sentence from the fixed template. A miss throws during the static build, and the unit test catches it first. Alternatives:
   - Store hex codes. Rejected: it could invent a color.
   - Pick outfits by rule (first best plus first neutral). Rejected: it gives dull or clashing pairs; the user approved hand-picked ones on the copy sheet.
3. **The sentence is built, not stored.** Three templates and an a/an rule ("An emerald dress", "An icy pink blouse", "an ink navy jacket") cover all 36 outfits, so no prose needs separate approval.
4. **Extra names are `alsoTyped: readonly string[]` beside `famous`.** They render as one paragraph between the photo list and the existing `FAMOUS_NOTE` caption. The section intro ("Public figures a color analysis studio has typed as …") and the note already cover text names. The names were read on 2026-11-04 from each season's Four Seasons Studio page, the same `source.url` the season's `famous` entries cite (12 pages, headings in page order). Spellings follow the person's usual name (Gisele Bündchen, Sofía Vergara, Sherilyn Fenn), not the studio's typos.
5. **Section order on the page.** Inside the right column: Avoid, Neutrals, Metals, Makeup and hair, Outfit ideas, Famous. From 1024 px, Makeup and hair uses the report's two-column grid. The outfits stack, each `Colors` at `columns={3} wide={6}`, so a swatch is the palette's size.

## Risks / Trade-offs

- [The studio edits or removes a name] → The link still points at its current list. The names are a dated reading, like the photos. Re-read the 12 pages if a person asks to be removed.
- [A longer page pushes the FAQ and the actions further down] → The palette-first scenario is unchanged, and the "Find out" action after the description still sits high on the page. No e2e test pins page height.
- [A palette color is renamed later] → `seasonOutfits()` throws, and the unit test that renders all 12 pages fails before deploy.

## Migration Plan

Static pages only. Deploy with the PR; roll back by reverting the merge. After deploy, request indexing for the 12 season pages in Search Console (by hand, the user's yes), as T21 did.
