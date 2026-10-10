## Why

On production (checked 2026-10-09), every page except `/privacy` and `/terms` is `noindex`, and the sitemap holds only those two. The landing, seasons, how-it-works, sample-report and GPT-alternative pages are 13–36-word stubs. The photo-tip and draping slots show grey placeholders. The launch gate (T11, Oct 26) needs the core pages to carry real content and be indexed. Traffic comes first: there is no paywall now, and the 300-analyses gate on Nov 25 decides the next investment. The GPT-alternative page also has a deadline, because custom GPTs retire on December 11, 2026. T9 is due Oct 22.

## What Changes

- **Canvas first (user gate).** The approved T14 boards (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3, row 4) already set the layout and most of the copy. tasks.md opens by filling their placeholders, and the user approves the result before any code:
  - the season page's "More about" copy and its neighbour lines for all 12 seasons;
  - "Famous Soft Autumns": names and photos for every season;
  - the photo-and-quiz-disagree line on How it works;
  - the facts on the GPT page;
  - real images in every photo slot;
  - Lucide icons in the design system.
- **Real photos, AI-generated (the user's choice, 2026-10-10).** One fictional model is generated, then edited into the "bad" twin of each tip, so every good/bad pair shows the same face:
  - three tip pairs on the guide (`/analyze`): light, makeup and filter;
  - the light pair on the landing;
  - one face for the draping preview on `/sample-report` and the GPT page.

  Generating the images is a paid run, so it waits for the user's yes. The user approves every image on the canvas.

- **Famous people per season, with Wikimedia Commons photos (the user's choice, 2026-10-10).** Each season page names 3 public figures, each with a freely licensed Commons photo and a credit line (author and license, linked). Each season assignment cites a published source. A note under the section says these are readings of public photos and imply no endorsement. The user approves the 36 names and photos.
- **Real content on every core page.**
  - Landing: the hero, a sample result (12 of the 30 Soft Autumn colors), how it works, the "A good photo, then gone" trust block and the 12-seasons block.
  - `/seasons`: the four families and the 12 seasons.
  - 12 season pages, which take the palette, colors to avoid, neutrals and metals from `season-palettes`. The summary, undertone, chroma and contrast come from `report-text`'s `SEASON_COPY`, the same words the report uses. The page adds its own longer copy, famous people and three neighbouring seasons.
  - `/how-it-works`: all five photo-check rejections, including "More than one face". The disagree line comes from `AGREEMENT_COPY`. "Never a wrong answer" is softened, since eval accuracy does not back it.
  - `/sample-report`: the Soft Autumn report with the sample face, a "Sample" marker and a CTA. It sends none of the funnel's custom events and makes no API call.
  - `/color-analysis-gpt-alternative`: the retirement date and what does not carry over, cited from OpenAI's FAQ and checked again at implementation.
- **All six content routes marked ready:** `/`, `/seasons`, `/seasons/<slug>` (all 12), `/how-it-works`, `/sample-report` and `/color-analysis-gpt-alternative`. They drop `noindex` and enter the sitemap: 19 URLs with `/privacy` and `/terms`.
- **No stub is left, so the stub-page scenario moves to a fixture route list.** The scenario stays in force for any page added later. Its E2E half is retired. Both are edits to existing tests, so they wait for the user's approval.
- **Lucide icons (the user's choice, 2026-10-10).** `Icon` keeps its 11 names and its API, but draws Lucide glyphs (`lucide-react`). The design system's bundle switches too, so the canvas and the app match.
- **No contact link (the user's choice, 2026-10-10).** `care@seasonly.me` is already on `/privacy` and `/terms`. The plan's carried "contact page" item closes without new UI.
- **Folded in from `docs/backlog.md`:** BL-06 (placeholder icons and empty photo slots) is deleted when this change ships.
- **Backlog repair.** Merged PR #15 cites BL-18 to BL-22, but none of them reached `docs/backlog.md`.
  - BL-18 (49 h worst-case crop age), BL-19 (PostHog cookie without consent) and BL-21 (macOS case-insensitive season slug in E2E) are rebuilt from the t8 records.
  - BL-20 and BL-22 are recovered from the t8 session, or from the user.
  - `_Next id:_` becomes BL-23.

## Capabilities

### New Capabilities

- `site-content`: what each core page shows and where its words and colors come from:
  - every indexed page carries real content above a word floor, with no placeholder copy or empty photo slot;
  - season pages read the shared palettes and season copy, and credit every famous-person photo;
  - the sample report is static and sends nothing;
  - the GPT page states only cited facts.

### Modified Capabilities

- `site-structure`: in "A page is indexed only once its content ships", the stub scenario is checked against a fixture route list, since no real stub is left.
- `capture-flow`: on the photo guide, each tip card shows its good and bad example photo with alt text instead of a labeled placeholder.
- `ui-components`: an icon draws the Lucide glyph mapped to its name. The 11 names stay the same.

## Impact

- **Code**
  - `apps/web/src/app/(site)/{page,seasons,seasons/[season],how-it-works,sample-report,color-analysis-gpt-alternative}/page.tsx`: the content.
  - `apps/web/src/lib/site-content/` (new): typed per-season copy, neighbours, famous people with credits, the sample data and image metadata.
  - `apps/web/src/lib/site/routes.ts`: six `ready` flips.
  - `apps/web/src/lib/report/sections.tsx` (new, split out of `view.tsx`): the report sections, so the sample page reuses them without importing the share, save, premium and face-route pieces.
  - `apps/web/src/app/(flow)/analyze/_capture/steps.tsx`: the guide images.
  - `apps/web/src/components/ds/icon.tsx`: Lucide.
- **Assets:** about 8 generated images and 36 Commons photos under `apps/web/public/images/` (spec-exempt), resized to WebP. The credits live in code beside the content.
- **Dependencies:** `lucide-react` (ISC).
- **Paid run (user gate):** image generation through the AI Gateway.
- **Existing tests (user approval):**
  - `apps/web/src/lib/site/routes.test.ts` ("marks a stub noindex…" and "drops noindex… once it is marked ready", both on `/how-it-works`);
  - `e2e/site-structure.spec.ts` ("a stub page carries noindex");
  - the DS icon tests, if they pin path data.
- **Spec map:** a new `site-content` row in `openspec/specs/README.md` at archive. It covers `apps/web/src/lib/site-content/**` and the six content page files, not `privacy/` or `terms/`, which belong to `legal-pages`.
- **Not changed:** the route table, slugs, redirects, canonical rules and analytics events. The landing keeps the funnel's entry `$pageview`, and `e2e/funnel.spec.ts` stays green.
- **Downstream:** T11's launch gate gets "core pages indexed". After merge, production shows no `noindex` on the six routes and a 19-URL sitemap. That check is recorded in a Tracker Log line.
