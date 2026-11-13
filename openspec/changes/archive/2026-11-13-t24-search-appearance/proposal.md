## Why

Google has shown the season pages since about October 24. On 2026-11-10 Search Console counted 172 impressions and 0 clicks in those 17 days, at an average position of 29.6. The head queries sit deep ("true summer color palette", 9,900 US searches a month at difficulty 13 in Semrush, is at position 79), and that is domain age and authority: Semrush counts 2 referring domains. No code fixes that. But the audit of the same day found four things on the pages that waste the impressions we do get:

- **The snippet is unreadable.** Google ignores the meta description and quotes the first list on the page, the palette. A swatch's name and hex code are two adjacent spans, so the result reads "Soft Blue#6F95C8 · Sky Blue#8FB3DB · Denim Blue#5C7FAE".
- **A shared link has no preview.** No page carries Open Graph or Twitter tags.
- **The result is labeled "seasonly.me", not "Seasonly".** No page carries structured data, so Google has no site name.
- **A season page has no image of its palette.** The swatches are colored boxes, so Google Images and Pinterest have nothing to show, and this query's results are image-heavy. `/images/palette/<slug>` already serves that image, but only a report links to it.

The same data shows searches the pages almost answer: "soft autumn yellow" (position 8), "true autumn yellows" (9), "soft summer yellows" (11) and "can a deep autumn wear black" (96). The evidence is thin, 7 impressions over 6 queries, but the answers are already in the palette data.

## What Changes

1. **Hex codes stay out of search snippets.** A swatch marks its hex code `data-nosnippet`. The name stays quotable, so a snippet can read "Soft Blue · Sky Blue · Denim Blue". Nothing changes on screen.
2. **Every indexed page carries link-preview tags.** Open Graph and Twitter tags built from the route map: the page's title, description and canonical URL, the site name "Seasonly", and an image. A season page uses that season's square share card (`/images/share/<slug>/post`); every other indexed page uses Soft Autumn's, the sample season. The flow and a report get none: a report's preview would otherwise show Soft Autumn's card on another season's report.
3. **The home page names the site.** One `WebSite` JSON-LD block: name "Seasonly", URL `https://seasonly.me`.
4. **A season page shows its palette image and offers it to save.** A small block with the image (alt text naming the season and what it shows) and a "Save the palette image" link. Where it sits and how it looks is a canvas decision: boards 16 Season 375 and 1280, your approval before any UI code.
5. **Two more questions on every season page**, after the avoid question:
   - "Can a <Season> wear black?" Yes for the three Winters, whose neutrals include Black. For the other nine: not near the face, with the season's darkest neutral named as the swap.
   - "Which yellow suits a <Season>?" The yellows in that season's best colors, picked by name on a copy sheet, plus the yellow it should avoid when its avoid list has one. Soft Summer has no yellow among its best colors, and its answer says so.

   The answer templates and the 12 yellow lists need your approval.

- **Existing-test edits, each needing your yes:**
  - `apps/web/src/lib/report/view.test.tsx` line 42: a regex pins `<span class="sn-swatch__hex">` with no other attribute.
  - `apps/web/src/lib/site-content/content.test.tsx`: the FAQ question list (`ask`), the two test titles that count questions, and the destructuring of the answers.
- **Folded in from the backlog:** none. The Site section's only item, BL-116, waits on an outfit name that does not exist yet.
- **Not in scope:**
  - Links to the site. They are the main lever for the head queries and belong to the weekly launch batches, not to code.
  - New titles or meta descriptions. The titles read well in results; the snippet is the problem.
  - FAQ rich-result markup: Google shows it only for government and health sites.
  - Image entries in the sitemap: Google finds an `<img>` on an indexed page without them, and the sitemap test pins its URLs.
  - The draping pair's two hex codes. They are two values, not a list a snippet would quote.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: a swatch keeps its hex code out of search snippets.
- `site-structure`: every indexed page carries link-preview tags, and the home page names the site in structured data.
- `site-content`: a season page shows its palette image with a save link, and its questions grow from six to eight.

## Impact

- `apps/web/src/components/ds/swatch.tsx`: one attribute on the hex span.
- `apps/web/src/lib/site/routes.ts`: `pageMetadata()` adds `openGraph` and `twitter`; a small `siteJsonLd()` beside it.
- `apps/web/src/app/(site)/page.tsx`: renders the JSON-LD block.
- `apps/web/src/app/(site)/seasons/[season]/page.tsx`: the palette image block.
- `apps/web/src/lib/site-content/faq.tsx` and `seasons.ts`: the two questions; `SeasonContent` gains `yellows`.
- Tests: new cases in `routes.test.ts`, `content.test.tsx` and the swatch's component test; the two approved edits above.
- Canvas: boards 16 Season 375 and 1280, plus a copy sheet for the two answers.
- After deploy: Search Console "Request indexing" for the 12 season pages and the home page, in your Chrome, with your yes.
- No new dependency, no migration, no paid run. `packages/analysis` is untouched, so the eval cannot move.
- Not measurable by the eval. The measure is Search Console: the snippet Google shows for "true summer color palette", and clicks per season page at the January 15, 2027 search checkpoint.
