## Context

The six content routes exist as stubs with `ready: false` (`apps/web/src/lib/site/routes.ts`). Their layouts and most of their copy are on the approved T14 boards: Main, Landing-1280, Seasons(-1280), Season(-1280), HowItWorks, SampleReport and GptAlternative. These boards still hold placeholders:

- `[MORE ABOUT SOFT AUTUMN …]`;
- `[FAMOUS SOFT AUTUMNS …]` with three `[PHOTO]`/`[NAME n]` slots;
- `[WHAT HAPPENS WHEN PHOTO AND QUIZ DISAGREE …]`;
- `[WHAT HAPPENS TO PAST GPT CHATS …]`.

Most of the data the pages need already ships:

- `PALETTES` and `seasonFamily` (`season-palettes`);
- `SEASON_COPY`, with tagline, summary, undertone, chroma and contrast for all 12, and `AGREEMENT_COPY` (`report-text`);
- the photo-check tips, from `packages/analysis`;
- the report sections, in `lib/report/view.tsx`.

The boards' season strips, neighbour colors and landing sample are design data written before `season-palettes` landed. The landing's sample 12 are all real Soft Autumn colors.

`ReportView` takes a stored report and an id. It renders `ShareButton`, `SaveButton`, `PremiumCard`, and `ReportDraping`, which loads `/api/face/<id>`. All four make requests or send funnel events, so the sample page cannot use it whole.

`Slot`, `PhotoTipCard` and `DrapingPair` already take `src`/`alt` and `faceSrc`/`faceAlt`. The only change needed for real photos is passing image paths.

`Icon` draws 11 hand-made placeholder paths on a 20 px viewBox.

OpenAI's custom-GPT retirement, from OpenAI's FAQ, read in the browser on 2026-10-10:

- Custom GPTs retire on Dec 11, 2026, and their pages become inaccessible then. Enterprise workspaces with an approved deferral retire on Feb 11, 2027.
- Creators can migrate a GPT to a plugin. A user's access, the sharing settings, the chosen model and custom actions do not carry over.
- Existing conversations with custom GPTs stay accessible after retirement.

Sources: https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq and https://virtualizationreview.com/articles/2026/09/28/openai-to-retire-custom-gpts-replace-them-with-plugins.aspx.

## Goals / Non-Goals

**Goals:**

- Every number and color on a content page comes from the analysis core, so a season page can never drift from a report.
- New copy is data in one typed module. A missing season fails to compile.
- The canvas is the approved source of copy and layout. Code ports it and does not invent copy.

**Non-Goals:**

- Keyword clusters, celebrity-only pages, a Lighthouse budget, structured data (JSON-LD) and Open Graph images per page. These are post-launch SEO.
- A contact page or link (the user's choice, 2026-10-10).
- Re-tuning analysis accuracy (T15).
- Changing the route table, the redirects or the analytics events.

## Decisions

### 1. Content lives in `apps/web/src/lib/site-content/`, typed per season

The module `site-content/seasons.ts` holds a `Record<SeasonSlug, SeasonContent>`. Each entry has:

- `about`: paragraphs, at least 120 words in total;
- `neighbours`: three `{ slug, why }`;
- `famous`: three `{ name, image, alt, credit: { author, license, licenseUrl, commonsUrl }, source: { title, url } }`.

Page-level copy that is not per season stays in each `page.tsx`, as the boards give it. Images and their alt text live in `site-content/images.ts`. This module gets its own `site-content` row, and it never overlaps `site-structure`'s `lib/site/**`.

- **Alternative: add the copy to `report-text`'s `SEASON_COPY`.** Rejected. That copy is the report's, and the core is shared with the plugin. Page-only SEO prose doesn't belong there.
- **Alternative: MDX per season.** Rejected. It adds a build dependency, and a missing season would not fail typecheck.

### 2. Colors on the pages come from the core, not from the boards' data

The landing's 12-seasons strips and each neighbour's four colors use `PALETTES[slug].highlights.slice(0, 4)`. These highlights were approved 2026-10-07, and the report email and teaser already show them. Where a board's strip differs, the core wins, and the canvas is updated to match in task 1. The landing sample keeps the board's 12 Soft Autumn colors, read by name from `PALETTES["soft-autumn"]` so a renamed color fails the test.

### 3. The sample report reuses the report's sections, not `ReportView`

`view.tsx` is split in two, and the sections move to their own file, `lib/report/sections.tsx`, so the sample page never imports the module that pulls in `ShareButton`, `SaveButton` and `PremiumCard`:

- `ReportSections({ season, agreement, summary?, agreementNote?, draping })` renders the season block and sections 1–6, with the draping pair passed in as a node;
- `ReportView` keeps its header, Share, Save, Premium and `ReportDraping`, and wraps `ReportSections`.

`/sample-report` renders `ReportSections` with:

- `season: "soft-autumn"` and `agreement: "agree"`;
- the board's sample summary and note;
- a static `DrapingPair` on the sample face from `/images/`.

It adds no client component that tracks events. The report-page tests must stay green unchanged: this is a refactor with no behavior change, so report-page gets no delta.

- **Alternative: a `sample` flag on `ReportView`.** Rejected. Every interactive child would need a branch, and one missed branch sends a funnel event from a marketing page.

### 4. Example photos: one generated model, edited into her bad twins

A one-off script, `scripts/generate-photos.ts` (spec-exempt, not run in CI), calls an image model through the AI Gateway with `AI_GATEWAY_API_KEY`. It has two steps:

1. Generate one base portrait: a fictional woman in her late 20s, a frontal daylight selfie with bare skin and her hair back.
2. Edit that image into each bad twin: a warm ceiling lamp from above, foundation and bronzer, and a beauty filter. Each twin is a new image of the same face.

The model must take an input image to edit, such as Gemini 2.5 Flash Image on the Gateway. The model is confirmed against the Gateway's model list at implementation.

The same base image, cropped to the face, is the sample draping face. Outputs are 4:5 or 3:4 WebP at 2× their slot's width, at most about 80 KB each, in `apps/web/public/images/examples/`.

The paid run is one batch of about 8 images. It starts only after the user's yes, and the cost is stated when asking. The user then approves every image on the canvas.

- **Alternative: stock photos.** Rejected by the user. Pairs would show different faces.
- **Alternative: separate prompts per twin.** Rejected. The face drifts between images, which defeats the good/bad comparison.

### 5. Famous people: Commons photos with credits, sourced assignments

For each season, the agent proposes three public figures. Each assignment needs a published color-analysis source, and each figure needs a Commons photo under CC0, CC BY or CC BY-SA. Fair use and "all rights reserved" do not qualify.

Each photo is downloaded once from its Commons file page into `apps/web/public/images/famous/<slug>/`. It is cropped to 3:4 and saved as WebP. A crop of a CC BY-SA photo is a derivative, so it keeps CC BY-SA, and the credit says "cropped". Credits render as a caption under each photo: "Photo: <author>, <license> (link), cropped".

The proposal, as a table of name, season, source, Commons URL and license, is part of the canvas approval in task 1.

- **Alternative: hotlinking `upload.wikimedia.org`.** Rejected. It adds another third-party host that sees visitors' IPs, and `/privacy` would have to name it.

### 6. Lucide through the `lucide` package, keeping `Icon`'s API

`Icon` maps its 11 names to Lucide components:

| Name          | Lucide component |
| ------------- | ---------------- |
| `check`       | `Check`          |
| `cross`       | `X`              |
| `lock`        | `Lock`           |
| `camera`      | `Camera`         |
| `upload`      | `Upload`         |
| `sun`         | `Sun`            |
| `clock`       | `Clock`          |
| `trash`       | `Trash2`         |
| `mail`        | `Mail`           |
| `info`        | `Info`           |
| `arrow-right` | `ArrowRight`     |

The `sn-icon` class, the size, `aria-hidden` without a label and `role="img"` with a label all stay. The stroke width is 1.75 on Lucide's 24 px grid, as the approved design system's bundle.js (version 25) draws it; that is about 17% lighter than the old placeholders' 1.75 on a 20 px grid.

The design system artifact's `bundle.js` Icon is switched to the same Lucide path data, so the canvas renders what the app renders. This is part of task 1, a DS change that needs its own version note.

- **Alternative: copying Lucide's path data inline.** This avoids the dependency. Rejected: Lucide icons are multi-element SVGs, and `lucide-react` tree-shakes to the 11 icons used.
- **Alternative: `lucide-react`.** Tried first, at implementation. Rejected: its components always add `lucide` and `lucide-<name>` classes, which have no design-system rule and fail the stylesheet test ({@link openspec/specs/ui-components/spec.md#requirement-every-class-a-component-renders-has-a-design-system-style}), and its `Icon` is a client component. `Icon` instead draws the shape data the vanilla `lucide` package exports (ISC, tree-shaken to the 11 icons) inside its own `svg`, on Lucide's 24 px viewBox.

### 7. Word floor and placeholder checks run on rendered HTML

One unit test renders each core page with `renderToStaticMarkup`, as `(site)/legal-pages.test.tsx` renders privacy and terms, looping over the 12 slugs. The season page is an async server component, so the test first awaits `Season({ params: Promise.resolve({ season }) })` and renders the element it returns. It strips the header and footer (`SiteShell` wraps `main`, so the test renders the page alone), then asserts two things:

- `≥ 250` words;
- no `/\[[A-Z][A-Z0-9 :'’,.-]+\]/` and no `sn-slot__label`.

A second test reads `site-content/seasons.ts` and checks that each `about` text is at least 120 words and that all 12 are distinct.

The sample report's "nothing is sent" scenario is an E2E test. It opens `/sample-report`, scrolls to the end, and asserts there was no `/api/` request and none of the nine custom funnel events. PostHog's `defaults: "2025-05-24"` keeps autocapture and `$pageleave` on, so those are allowed. It reuses `funnel.spec.ts`'s route stub for the dead PostHog host.

### 8. The stub scenario moves to a fixture; the E2E stub case retires

`routes.test.ts`'s stub and ready cases build their own route list, with `/how-it-works` set to `ready: false` or `true`, instead of reading `ROUTES`. `pageMetadata(path, routes)` and `indexedUrls(routes)` already take a list. The scenario's anchor (`#scenario-a-stub-page`) stays, so citations hold.

`e2e/site-structure.spec.ts`'s "a stub page carries noindex" is deleted. Production has no stub left to fetch. The new `site-content` scenario "The core routes are ready" is covered in `seo.test.ts`: `indexedUrls()` on the real route map equals the 19 URLs.

All three test edits need the user's approval before they are made.

## Risks / Trade-offs

- **Season assignments for famous people are opinion, and Commons coverage is uneven.** Mitigation: each figure needs a linked source and a reusable photo, or it is not shown. If a season can't reach three, the user decides in task 1 whether to show fewer. That would change the spec's "three", so it is an approval decision recorded in tasks.
- **CC BY-SA crops carry share-alike.** Mitigation: the credit names the license, and the crop is the only change.
- **Generated faces can look uncanny or read as a real person.** Mitigation: the user approves each image, and the model is prompted for a non-celebrity, ordinary look. The spec requires a fictional person.
- **OpenAI's dates may move before Dec 11.** Mitigation: the page states the date with "OpenAI says" and links the FAQ. Task 3.9 re-checks it the day the page ships, and the Tracker gets a reminder to re-check in November.
- **Indexing six routes at once exposes copy errors to crawlers.** Mitigation: the user does a read-through on the preview before merge, as part of the acceptance task.
- **The word floor counts swatch names and figure credits.** A page could clear 250 words on lists alone. Mitigation: the per-season `about` check (120 words, distinct) guards the thinnest template, and the canvas approval guards the rest.
- **The new dependency adds bundle weight.** `lucide` with named imports adds under 3 KB for 11 icons.

## Migration Plan

Merge, and Vercel deploys production. After deploy:

- fetch the six routes and confirm no `noindex`;
- fetch `/sitemap.xml` and confirm 19 URLs;
- submit the sitemap in Google Search Console, if the user has it set up.

Record the result in a Tracker Log line.

Rollback is a revert of the PR. Setting a route's `ready` back to `false` alone takes it out of the index.

## Open Questions

- Which Gateway image model edits best for same-face twins, Gemini 2.5 Flash Image or another one? This is settled by a single test image inside the approved paid run. It changes neither the spec nor the tasks.
