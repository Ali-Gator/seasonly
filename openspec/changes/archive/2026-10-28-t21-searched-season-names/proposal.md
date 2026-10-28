## Why

Eight of the 12 seasons are searched under a second name as well as ours: "dark autumn" (18,100 US searches a month) beside "deep autumn" (22,200), "cool summer" (14,800) for True Summer, "warm spring" (8,100) for True Spring, and so on (Semrush, Launch plan "Search targets", read 2026-10-27). Our season pages name only one, so they cannot match the other half of those searches. The pages also answer none of the questions searchers ask about a season (what to avoid, hair, makeup, metals). This is the code part of Tracker row T21 ("Search foundation"); its recrawl part is done by hand in Search Console (all 17 pages requested by 2026-10-28). It is Launch plan step 2, due Nov 3, ahead of the Product Hunt launch on Nov 4.

## What Changes

- **Second names in titles and descriptions.** The eight seasons with a common second name read "Deep (Dark) Autumn", "Deep (Dark) Winter", "True (Warm) Spring", "True (Warm) Autumn", "True (Cool) Summer", "True (Cool) Winter", "Bright (Clear) Spring" and "Bright (Clear) Winter" in the page title and the meta description. Example: "Deep (Dark) Autumn color palette and colors to avoid · Seasonly". Light Spring, Light Summer, Soft Summer and Soft Autumn keep one name. Clear for the two Brights was the user's choice on 2026-10-28.
- **Second names on the page.** The same eight show the double name in their h1, and the first paragraph after the palette opens with "Also called Dark Autumn." Everything else on the page (palette heading, buttons, neighbours, header menu, report, share card) keeps the one name.
- **Two more redirects.** `/seasons/dark-autumn` and `/seasons/dark-winter` 308 to `deep-autumn` and `deep-winter`, like the six aliases that already exist. Every second name then has its redirect.
- **A short FAQ per season page.** A "Questions about <Season>" section before "Is this you?", in How it works' expandable style (the user chose to reuse it without a canvas, 2026-10-28). Up to six questions: whether the second name is the same season, colors to avoid, hair color, makeup, metals, and how to find out. Every answer is built from the shared season copy and palettes the page and the report already show, so no new claim enters the site.
- **Not in scope:**
  - The recrawl and the noindex validation (Search Console, by hand).
  - Season page depth beyond the FAQ (celebrities, outfits; Launch plan step 5).
  - FAQ structured data (see design.md).
  - Second names on `/seasons`, the landing or the neighbour links.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-structure`: two more alias redirects; the eight season titles and descriptions carry the second name.
- `site-content`: the season page's h1 and first paragraph carry the second name; each season page gets a FAQ built from shared copy.

## Impact

- `apps/web/src/lib/site/routes.ts`: the second names, a `searchName(slug)` used to fill the season title and description, and `SEASON_ALIASES` derived to include `dark-autumn` and `dark-winter`. `next.config.ts` already builds redirects from `SEASON_ALIASES`, and `e2e/site-structure.spec.ts` already loops over it.
- `apps/web/src/app/(site)/seasons/[season]/page.tsx`: the h1, the "Also called" opener and the FAQ section.
- `apps/web/src/lib/site-content/`: `faq.tsx`, the expandable list shared with How it works, and the per-season questions built from `SEASON_COPY` and `PALETTES`.
- `apps/web/src/app/(site)/how-it-works/page.tsx`: renders its FAQ through the shared list; its output is unchanged.
- Tests: one existing assertion needs the user's yes. `apps/web/src/lib/site/routes.test.ts` pins `SEASON_ALIASES` with `toEqual` on the six entries; it gains `dark-autumn` and `dark-winter`. New tests cover the titles, the h1, the opener and the FAQ.
- No new dependency, no migration, no paid run. The analysis is untouched, so the eval cannot move.
- After deploy: request indexing again for the eight renamed pages (Search Console, by hand).
