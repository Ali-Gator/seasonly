## Why

The 12 season pages are Seasonly's main search pages: the season-palette queries add up to about 250,000 US searches a month (soft autumn 40,500, soft summer 33,100; Semrush, read 2026-10-27). The #1 result for most of them is a long guide that answers what searchers ask next: makeup, hair, what to wear, who else is this season, what to avoid. Our pages show the palette, avoid colors, neutrals and metals, but no makeup, no hair, no outfits and only three famous people. The report already holds makeup and hair colors for every season, so the page can answer those questions from the same data. This is Launch plan step 5 (Nov 9–20), Tracker row T23.

## What Changes

- **Makeup and hair on every season page.** A "Makeup and hair" section with the season's lip, blush, eye and hair colors and the report's makeup line and hair tip, in the report's own layout. The block is lifted out of the report into one shared component, so the report and the page cannot drift apart.
- **Outfit ideas on every season page.** An "Outfit ideas" section with three outfits: Everyday, Work and Evening. Each is three swatches (a best color, a best neutral and a best metal, named from the season's palette) and one sentence from a fixed template, for example "A sage top with oatmeal trousers and brushed gold jewelry." No new color or hex code is made up; a name that is not in the palette fails the build's tests.
- **More famous names.** Under the three credited photos, one line names three to six more people from the same Four Seasons Studio page the section already cites: "The same studio also types Angelina Jolie, … as Soft Autumns." Text only, no photos, so no new licenses. The note that these are readings of public photos and that no one endorses Seasonly stays under them.
- **Folded in from the backlog.**
  - BL-113: the GPT-alternative boards now carry the plugin's publisher line. That was a canvas edit, made and approved with this change's boards; the item is deleted.
  - BL-109: the e2e alias loop's doc comment also cites "A dark name". The user approved this edit to an existing test on 2026-11-04.
- **Not in scope:**
  - New titles or meta descriptions (site-structure); the pages are not indexed yet, so this can follow the first Search Console data.
  - New FAQ questions. The FAQ test pins the question list, and Google no longer shows FAQ rich results for these sites.
  - Prints and patterns, and the "wear this instead" pairs some guides add.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-content`: a season page adds makeup and hair (shared with the report), three outfit ideas built from palette names, and more studio-sourced famous names.

## Impact

- `apps/web/src/lib/report/sections.tsx`: the report's "Makeup and hair" block becomes an exported `MakeupAndHair`. The report's output is unchanged; `report-page` behavior does not change, so it gets no delta.
- `apps/web/src/lib/site-content/seasons.ts`: `SeasonContent` gains `outfits` (three `[best, neutral, metal]` name triples) and `alsoTyped` (names); a small helper turns a triple into swatches and its sentence.
- `apps/web/src/app/(site)/seasons/[season]/page.tsx`: the two new sections and the names line, before Famous.
- Tests: new unit tests in `apps/web/src/lib/site-content/content.test.tsx` cite the new scenarios. The only edit to an existing test is BL-109's doc comment in `e2e/site-structure.spec.ts` (approved).
- Canvas: MVP canvas version 76, approved by the user on 2026-11-04 "as drawn" (boards 16 Season 375 and 1280, new 16c copy sheet, 19 GptAlternative 375 and 1280).
- No new dependency, no migration, no paid run. `packages/analysis` is untouched, so the eval cannot move.
