## Context

See proposal.md for why. Today `routes.ts` (site-structure) fills the one season route's `{season}` with `seasonName(slug)` ("Deep Autumn") and holds `SEASON_ALIASES` as a hand-written list of six. The season page (site-content) renders `seasonName` in its h1 and everywhere else, and How it works keeps its FAQ as a local `[question, answer][]` rendered with `<details>`. `SEASON_COPY` (report-text, in the analysis core) already carries per-season `hairTip`, `makeupIntro` and `metalsIntro`, approved with the report copy; `PALETTES` carries named `avoid`, `metals` and `metalsAvoid` swatches.

## Goals / Non-Goals

**Goals:**

- One source for the second names, read by the titles, the h1, the opener, the FAQ and the redirects.
- FAQ answers assembled from approved shared copy, with no new per-season prose to review.

**Non-Goals:**

- No change to `seasonName`: the report, share card, palette image, email, header menu and neighbour links keep the one name.
- No FAQ structured data (`FAQPage` JSON-LD). Google shows FAQ rich results only for well-known government and health sites since August 2023, so it would add code with no visible effect.
- No change to the analysis core or `SEASON_COPY`.

## Decisions

1. **Second names live in `routes.ts` as one word per season.** `SECOND_NAMES: Partial<Record<SeasonSlug, string>>` = `{ "true-spring": "Warm", "bright-spring": "Clear", "true-summer": "Cool", "true-autumn": "Warm", "deep-autumn": "Dark", "deep-winter": "Dark", "true-winter": "Cool", "bright-winter": "Clear" }`. Exported helpers:
   - `secondName(slug)`: "Dark Autumn", or undefined.
   - `searchName(slug)`: "Deep (Dark) Autumn", or `seasonName(slug)` when there is none.

   `routeAt` fills `{season}` with `searchName`, so the title and the description change together and no new template token is needed. Alternative: a separate `{searchName}` token. Rejected: the season entry is the only user of `{season}`, and both strings want the double name.

2. **`SEASON_ALIASES` is derived from `SECOND_NAMES`.** Each entry maps `secondName` lowercased and hyphenated ("dark-autumn") to its slug. That gives the six existing entries plus `dark-autumn` and `dark-winter`, and makes "every second name has one redirect" true by construction. `next.config.ts` and `e2e/site-structure.spec.ts` read `SEASON_ALIASES` already, so they pick up the two new redirects unchanged. The pinned `toEqual` in `routes.test.ts` gains the two entries (the user's yes, task 1.2). The keys keep today's order where they exist, so the redirect list reads the same.

3. **The page uses `searchName` only for the h1.** The opener "Also called Dark Autumn." goes inside the summary paragraph, before `copy.summary`: `<p>{also}{copy.summary}</p>`. A separate paragraph would add a line of white space above the summary on a phone. The existing test that `text(out)` contains `copy.summary` stays true.

4. **One `Faq` component, shared.** `lib/site-content/faq.tsx` exports `Faq({ id, title, items })`: the section, its h2, and the `<details>` list with the first item open. The markup and classes come from How it works unchanged, and How it works switches to it, so both pages look the same and How it works' output does not change. The season page passes `SECTION`-like classes matching its other bottom sections (`border-t border-(--line) pt-(--space-6)`).

5. **Questions are built in `lib/site-content/faq.tsx`, beside `Faq`** (`seasons.ts` is a plain `.ts` data file, and the last answer holds a link). `seasonFaq(slug): [string, ReactNode][]` composes the answers from `SEASON_COPY` and `PALETTES`:
   - Same as (second name only): "Yes. <Second> <Family> and <Season> are two names for the same season, with the same palette."
   - Avoid: "<A>, <B> and <C>. They compete with <Season> coloring, so keep them away from the face. Trousers, shoes and bags in them are fine." (the first three `palette.avoid` names; the closing words echo the page's own "Colors to avoid" intro)
   - Hair: `copy.hairTip`.
   - Makeup: `copy.makeupIntro`.
   - Metals: "`copy.metalsIntro` Wear <metals>. Go easy on <metalsAvoid>." (names joined "a, b and c")
   - Find out: "Take one daylight selfie and answer four quick questions. Seasonly reads your undertone, depth and contrast and names your season in under a minute." with "Find your colors" linking to `/analyze`.

   Questions use "a <Season>" as the page's own "Find out if you're a <Season>" does. The section's h2 is "Questions about <Season>", with the one name.

## Risks / Trade-offs

- [The double name in a display-size h1 wraps on a phone: "Bright (Clear) Winter" is the longest at 21 characters] → It wraps to two lines at 375 px at most; the palette-in-first-screen E2E runs on Soft Autumn, which has no second name, so task 3.3 checks one double-name page at 375 × 812 by screenshot and keeps the first swatch in view.
- [Templated answers read alike across the 12 pages] → Every answer carries the season's own colors, metals, hair and makeup words, which differ per season; Launch plan step 5 adds per-season depth later.
- [Renamed titles reset what Google has seen] → Google has indexed none of the 17 pages yet (Search Console, 2026-10-27), so nothing ranked is lost. After deploy, request indexing again for the eight (task 4.4).

## Migration Plan

Deploys with the next production build. Rollback is a revert; the two new redirects then disappear, which is harmless since nothing links to them yet.
