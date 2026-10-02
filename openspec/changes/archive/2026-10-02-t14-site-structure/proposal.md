## Why

The approved MVP canvas covers only the analysis flow. The pages that carry search traffic have no design and no fixed URLs yet: the season pages, the GPT-alternative page, how it works, the sample report, privacy and terms. The architecture doc leaves SEO until after launch. But the URLs, the canonical host, what gets indexed and the sitemap are expensive to change once pages are live and linked, so they are fixed now. The missing pages get designed before any of them is coded.

## What Changes

- One route map for the whole public site. For each route it records the URL, whether the page is static or rendered on request, and whether it is indexed. It replaces the five "routes reserved now" in the architecture doc.
- The 12 season slugs are fixed for good (`/seasons/soft-autumn` and the rest). The common alternative names 308-redirect to them (`warm-autumn` goes to `true-autumn`, `clear-winter` to `bright-winter`). An unknown slug returns 404.
- The analysis flow lives at one route, `/analyze`, with the steps changing inside the page. Reports live at `/r/[id]`. Neither is ever indexed.
- Every page builds its title, description, canonical and robots from that one route map. The canonical host is `https://seasonly.me`, the apex domain, which Vercel serves as primary.
- `sitemap.xml` lists exactly the indexed routes. `robots.txt` blocks `/api/` and points to the sitemap.
- A page is indexed only once its content ships. Until then it can be live as a stub, marked noindex and left out of the sitemap, so thin pages never get crawled.
- The design system's tokens become CSS variables in the web app. The design system publishes `tokens.json` but no `tokens.css`; until now only the canvas carried its own copy (`base.css`). A committed copy of `tokens.json` and a unit test keep `globals.css` matching it, and the two fonts are self-hosted with `next/font`.
- Design first: artboards for the shared header and footer, the seasons index, the season page template, how it works, the GPT-alternative page, the sample report, legal pages and 404 are added to the MVP canvas. The landing's in-page anchor links become real routes. You approve the canvas before any code in this change.

## Capabilities

### New Capabilities

- `site-structure`: the public route map, season slugs and their aliases, indexability, canonical URLs and shared page metadata, `sitemap.xml` and `robots.txt`

- `design-tokens`: the design system's tokens and type styles as CSS variables and classes in the web app, checked against a copy of `tokens.json`, and the self-hosted fonts

### Modified Capabilities

None.

## Impact

- New code after the design gate: `apps/web/src/lib/site/**` (route map, metadata helper), `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`, stub pages for every public route, alias redirects in `next.config.ts`, the tokens in `apps/web/src/app/globals.css` with `apps/web/src/styles/tokens.json`, fonts in the root layout, unit and e2e tests.
- Later changes add page content into these routes instead of creating their own: `t5-analysis-flow` (`/analyze`), `t5-report-delivery` (`/r/[id]`), and the season page content after T9's outlines. `t4-analysis-core`'s `season-palettes` uses the same 12 slugs as season ids.
- Design canvas https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3 gains new artboards and needs a second approval.
- Tracker: new row T14 "Site map and SEO foundation".
- Out of scope: keyword research and page copy (T9), JSON-LD, per-season OG images (they need `t5-report-images`), a Lighthouse budget gate.
