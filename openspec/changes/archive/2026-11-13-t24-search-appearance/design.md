## Context

See proposal.md (Why). What exists today:

- `Swatch` (`apps/web/src/components/ds/swatch.tsx`) renders `<span class="sn-swatch__name">` then `<span class="sn-swatch__hex">` inside a `figcaption`; `SwatchGrid` wraps swatches in a `<ul>`. On a season page the palette grid is the first list in the document, which is what Google quotes.
- `pageMetadata(path)` (`apps/web/src/lib/site/routes.ts`) returns title, description, canonical and, for a page that is not indexed, `robots: { index: false }`. Every page calls it. No page sets `openGraph`, `twitter` or structured data.
- `/images/share/<slug>/post` (1080 × 1080) and `/images/palette/<slug>` (1080 × 1920) are static PNGs built at build time. `shareCardAlt(slug, "post")` in `lib/share-card/alt.ts` imports no renderer, so the route map can import it.
- `seasonFaq(slug)` (`apps/web/src/lib/site-content/faq.tsx`) builds the six questions from `PALETTES` and `SEASON_COPY`. `SEASON_CONTENT` (`lib/site-content/seasons.ts`) holds hand-picked palette names for the outfits, resolved by name and failing loudly on a miss.
- Tests that pin the touched markup: `lib/report/view.test.tsx:42` (a regex with `<span class="sn-swatch__hex">` and nothing else in the tag) and the `ask()` list in `lib/site-content/content.test.tsx`.

## Goals / Non-Goals

**Goals:**

- One place per fix: the swatch component, the route map, the home page, the season page, the FAQ builder.
- No new color, hex code or claim: every FAQ word about a color resolves in `PALETTES` by name.
- No change to `packages/analysis`: the eval cannot move and `results.json` stays fresh.

**Non-Goals:**

- No new image route and no new image design. Previews reuse the post card, the page reuses the palette image.
- No `FAQPage`, `BreadcrumbList` or `Article` markup. Google already shows the URL path as the breadcrumb, and FAQ rich results are not shown for this kind of site.
- No change to titles, descriptions, the sitemap or robots.txt.

## Decisions

1. **`data-nosnippet` on the hex span only.** Google honors the attribute on `span`, `div` and `section`, not on `ul`, `li` or `figure`, so the mark has to sit on a span or on a wrapper. With the hex hidden, the snippet Google builds from the list reads "Soft Blue · Sky Blue · Denim Blue", which answers a palette query, and "Orange · Golden Yellow · Rust" answers "colors to avoid". Alternatives:
   - Mark name and hex, or wrap each grid in a `div`. Rejected: it removes the color names from snippets and from Google's AI answers, and the names are the answer to the query.
   - Move the description above the palette in the HTML. Rejected: the palette-first order on a phone is a spec'd design decision (site-content, "The palette comes first on a phone").
   - Mark it only on season pages. Rejected: the landing and the sample report are indexed too and list swatches the same way; a report is not indexed, so the mark is harmless there.

   React writes attributes in prop order, so the attribute goes before `className`: the tests that match `class="sn-swatch__hex">` keep passing, and only `view.test.tsx:42`, which also pins `<span class=`, needs its approved edit.

2. **Link-preview tags come from `pageMetadata()`.** It adds `openGraph` (title, description, url, siteName, type, images) and `twitter` (card `summary`, title, description, images) for an indexed route, from the same `Route` and `url()` it already uses, so the preview can never disagree with the title or the canonical. Title, description and image are set on `twitter` explicitly rather than left to Next's inheritance from `openGraph`; task 3.2 checks the built HTML. A page that is not indexed gets `robots` and no preview, as today. Alternative: a root-layout default plus per-page overrides. Rejected: two places, and a report would inherit Soft Autumn's card.

3. **The preview image is the square post card, the Twitter card is `summary`.** The post card names the season and shows six colors, and 1:1 survives every messenger's crop. `summary_large_image` crops to 2:1 and would cut the season name off a square. The palette image is 9:16 and would lose most of its rows in any preview. Non-season pages use Soft Autumn's card because the landing and the sample report already show Soft Autumn. ponytail: one shared card for nine pages; give a page its own image when a share of it matters.

4. **`siteJsonLd()` lives in the route map and the home page renders it.** A constant object from `ORIGIN`, written into one `<script type="application/ld+json">` in `(site)/page.tsx` with `<` escaped as `<`. Alternative: Next's `metadata.other`. Rejected: it writes `<meta>` tags, not a script.

5. **The palette image is a plain `<img>` and a plain download link.** `<img src="/images/palette/<slug>" width="1080" height="1920" loading="lazy" alt="…">` and `<a href download="seasonly-<slug>-palette.png">`, both server-rendered, so Google Images and Pinterest see them and the page ships no new client code. The file name is the one the report's "Save my palette" already uses. Alternatives:
   - Reuse the report's `SaveButton`. Rejected: it is a client component that prefetches the file and sends `palette_saved`, an event the analytics spec defines for a report.
   - `next/image`. Rejected: the PNG is already built once at 200 KB and is shown small; an optimizer adds a second URL for the same picture, which splits what Google Images indexes.

   Where the block sits is the canvas's call. The proposal to draw: after "Outfit ideas" and before the famous people, a thumbnail about 96 px wide beside one line ("All 30 <Season> colors in one image, sized for your phone.") and the link. It stays out of the first screen, so the palette-first rule on a phone is untouched.

6. **Black is a rule, yellows are a list.**
   - Black: `PALETTES[slug].neutrals` includes a color named "Black" for the three Winters and for no other season. Otherwise the swap is the neutral with the lowest luminance (0.2126 R + 0.7152 G + 0.0722 B): Soft Navy, Warm Navy, Ink Navy, Soft Navy, Navy, Grey Navy, Espresso, Dark Chocolate, Espresso.
   - Yellows: `SeasonContent` gains `yellows: { wear: readonly string[]; avoid?: string }`, names resolved in `best` and `avoid` the way `seasonOutfits` resolves outfit names, throwing on a miss. Picking yellows by hue was tried on the data and rejected: a hue window that catches Mustard and Saffron also catches Avocado and Golden Olive.

   The proposed lists, for the copy sheet:

   | Season        | Yellows to wear                      | Yellow to avoid |
   | ------------- | ------------------------------------ | --------------- |
   | Light Spring  | Buttercup, Pale Daffodil, Light Gold | none            |
   | True Spring   | Marigold, Golden Yellow, Daffodil    | none            |
   | Bright Spring | Sunflower, Lemon Sorbet              | none            |
   | Light Summer  | Light Lemon                          | Mustard         |
   | True Summer   | Light Lemon                          | Golden Yellow   |
   | Soft Summer   | none                                 | Bright Yellow   |
   | Soft Autumn   | Honey, Mustard                       | Lemon Yellow    |
   | True Autumn   | Saffron, Golden Yellow, Mustard      | none            |
   | Deep Autumn   | Saffron, Mustard, Antique Gold       | Baby Yellow     |
   | Deep Winter   | Icy Lemon                            | Mustard         |
   | True Winter   | Lemon Yellow                         | none            |
   | Bright Winter | Lemon Yellow, Icy Lemon              | none            |

7. **The two questions go after the avoid question.** They are about colors, like it, and the avoid question stays first and open on a page without a second name, so the two existing scenarios keep their first question.

## Risks / Trade-offs

- [Google still writes its own snippet] → `data-nosnippet` only removes the hex codes; Google chooses the rest. The workflow follow-up in tasks.md reads the live result two weeks after the recrawl and records it in the Tracker. If the snippet is still poor, the next step is the wrapper `div` from decision 1.
- [Soft Summer's answer is "no yellow"] → It is what the palette says, and "soft summer yellows" is the most-seen of these queries. Adding a yellow to the palette is an analysis-core change and an eval question, not this change's.
- [The site name is Google's call] → `WebSite` markup is a hint. It can take weeks to show and Google may keep the domain.
- [Thin evidence for the two questions] → 7 impressions. They cost two templates and twelve short lists; the January 15, 2027 checkpoint shows whether those queries moved.
- [A portrait image shown small] → The thumbnail downloads the full 200 KB PNG. It loads lazily, below the first screen.

## Migration Plan

One deploy, no data change. Rollback is a revert. After deploy, Search Console "Request indexing" for the home page and the 12 season pages, about 10 a day, in the user's Chrome with their yes.
