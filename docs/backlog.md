# Backlog

Open items only. When one ships, **delete it**: its history lives in git and in the spec or
change that fixed it. The detail belongs in the linked spec or source; this file is the lean
index of what's left, grouped by area. Every item has the same shape:

```
- **[BL-nn] <Title>** — <what to do + why it matters, 1–2 sentences>.
  _Refs:_ `<spec / change / source>` · _Status:_ open | gated — <blocker> | deferred — <trigger>
```

**Ids** are `BL-nn` and **monotonic**. A new item takes the number on the `_Next id:_` line
below and bumps that line by one. Do not use the highest id still in the file, because it falls
every time a shipped item is deleted. Ids are **never reused**, so a `BL-nn` in a commit message
or an archived change always means the same item.

_Next id:_ **BL-49**

**Status** is one of: **open** (actionable now), **gated — X** (blocked on a named decision or
dependency), **deferred — X** (waiting on purpose for a named trigger). Split a multi-part item
into separate items rather than letting one grow into a paragraph.

**What goes here and what doesn't.** Work that a named later change already owns goes in the
plan's "Carried in from finished changes" list (Architecture and phases tab), not here. This file
holds what no change owns yet: phase-review findings left unfixed, and defects or gaps found
along the way that are worth fixing later. CLAUDE.md ("Backlog") says when to add and when to
fold items in.

## Analysis

- **[BL-13] Temperature reads cool and moves with the light** — skin hue moves with the light, so
  one person's temperature spreads across photos. The eye-white balance (Lab offset, commit
  `1d28b3d`) was re-run on the grown set in `t15-eval-growth` (2026-10-13): on the tuning set it
  cuts temperature spread 0.324 to 0.271 and lifts family agreement 0.70 to 0.78, but exact
  agreement rises only 0.015 (two photos is 0.023), and on the holdout temperature spread rises at
  every strength. Parked again: the eye white is not a reliable white reference across people.
  Look for a reference that holds on the holdout, after BL-45 lets more deep-skin photos pass.
  _Refs:_ `packages/analysis/src/sampling/traits.ts`, `openspec/changes/archive/*-t15-eval-growth/tasks.md` · _Status:_ gated — BL-45

- **[BL-48] A few eval people have two photos from one shoot** — p22/4 and p22/5 (one concert),
  and p26/1 and p26/2 (one event). Same-shoot
  pairs push that person's agreement up and trait spread down. Replace one of each pair with a
  photo in different light the next time the set grows, before that run.
  _Refs:_ `evals/manifest.json`, `openspec/changes/archive/*-t15-eval-growth/design.md` · _Status:_ open — found in `t15-eval-growth` phase review, 2026-10-13

- **[BL-45] The dark check rejects deep skin more often** — on the grown eval set, 9 of 41 usable
  photos of new deep-skinned people get `dark` (22%), against 4 of 45 medium (9%) and 6 of 72 in
  the original set (8%). The check reads overall brightness, so it penalizes deep skin. Measure
  exposure on something skin-independent (the eye white or the background) and tune it on the
  tuning set only, holding the catch rate.
  _Refs:_ `packages/analysis/src/photo-check/index.ts`, `openspec/changes/archive/*-t15-eval-growth/tasks.md` · _Status:_ open — found in `t15-eval-growth`, 2026-10-13

- **[BL-39] Skin hue barely separates warm and cool labels** — on the eval set, warm-labeled
  people average skin hue 47.1° and cool-labeled 44.0°, a 3° gap inside an 11° spread, so
  temperature cannot carry label accuracy (0.18) whatever the white balance does. Look for
  another warm/cool cue (hair, eyes, lips, or the quiz) before tuning temperature further.
  _Refs:_ `packages/analysis/src/sampling/traits.ts`, `evals/README.md` · _Status:_ open — found
  in `t15-white-balance`, 2026-10-12

- **[BL-15] CI checks a committed eval result, not the photos** — only a machine with the
  photos can refresh `results.json`. Run `eval:fetch` and `eval:run` in CI (Playwright's
  Chromium is already there) once a Commons fetch from CI proves stable.
  _Refs:_ `.github/workflows/ci.yml`, `evals/gate.ts` · _Status:_ deferred — until fetching about
  100 Commons originals per CI run is judged stable

- **[BL-29] The quiz alone never gives three seasons** — over all 750 answer combinations,
  quiz-only classification reaches 10 seasons and never Soft Autumn, Soft Summer or Bright Spring,
  on the web quiz-only path and in the chat plugin. Decide whether the quiz weights should move
  clarity enough to reach them, or say in the season-classifier spec that a photo is needed for them.
  _Refs:_ `packages/analysis/src/classifier/reference.ts`, `openspec/specs/season-classifier/spec.md`
  · _Status:_ open — found in `t12-mcp-teaser`, 2026-10-11

## Privacy

- **[BL-18] A crop can stay about 49 h while the pages say 24 h** — the retention job runs once a
  day (Vercel Hobby) with a 24 h cutoff, so a crop stored just after a run lasts until the run
  after next. Move to an hourly scheduler (Vercel Pro, or `pg_cron` + `pg_net` calling the same
  route); no other code changes.
  _Refs:_ `apps/web/vercel.json`, `openspec/specs/data-retention/spec.md` · _Status:_ deferred —
  Vercel Pro or before paid promotion (T15); the user's choice, 2026-10-09

- **[BL-19] The PostHog cookie is set without consent** — an ePrivacy risk for EU visitors,
  disclosed on `/privacy`. Turn on `cookieless_mode`, or add a banner with `on_reject`.
  _Refs:_ `apps/web/src/lib/observability/posthog.ts`, `openspec/specs/analytics/spec.md` ·
  _Status:_ deferred — before paid promotion or a complaint; the user's choice, 2026-10-09

- **[BL-43] The guide notice does not say Google may keep the crop** — the photo guide names
  Google as the reader, then says "We delete it within 24 hours", while `/privacy` says Google may
  keep the crop up to 90 days for abuse checks. The notice links to `/privacy`, but a reader of the
  notice alone thinks every copy is gone in a day. Needs a canvas line (board 02) first.
  _Refs:_ `apps/web/src/app/(flow)/analyze/_capture/steps.tsx` (`Guide`),
  `openspec/specs/capture-flow/spec.md` · _Status:_ open — phase review of `t11-no-consent-step`,
  2026-10-12 (carried from BL-20)

- **[BL-44] Three site pages still say "We keep your result"** — `/how-it-works` ("Deleted within
  24 hours" note), the landing and `/color-analysis-gpt-alternative` say only the result is kept,
  though the report also holds the measured traits, quiz answers and personal text (the email
  footer and the how-it-works FAQ now say "your report"). Needs a canvas line first.
  _Refs:_ `apps/web/src/app/(site)/how-it-works/page.tsx`, `apps/web/src/app/(site)/page.tsx`,
  `apps/web/src/app/(site)/color-analysis-gpt-alternative/page.tsx` · _Status:_ open — phase
  review of `t11-no-consent-step`, 2026-10-12

- **[BL-30] Sentry error reports can carry request bodies** — Sentry 10.75 attaches an incoming
  request's body (up to about 10 KB) to an error event by default, even with default PII off, so a
  failed analyze or email request can send quiz answers or email addresses. `/privacy`'s Sentry row
  says only "the page address and your browser". Either set `ignoreRequestBody` / `maxRequestBodySize`
  or update the row (the plugin section already discloses it).
  _Refs:_ `apps/web/sentry.server.config.ts`, `apps/web/src/app/(site)/privacy/page.tsx`
  · _Status:_ open — found in `t12-mcp-teaser`, 2026-10-11

## Code quality

- **[BL-02] A hung crop upload is abandoned, not cancelled** — `upload()` in
  `@supabase/storage-js` 2.117 takes no abort signal, so after the 3 s timeout the request keeps
  running until the function's time limit ends it. It is harmless today because the response is
  already sent. Wire an `AbortController` through the client's `global.fetch`, or a newer
  storage-js that takes a signal.
  _Refs:_ `apps/web/src/lib/draping/crops.ts`, `openspec/specs/draping-preview/spec.md` ·
  _Status:_ deferred — until Sentry shows `crop upload timed out` events, or storage-js adds a
  signal to `upload()`

- **[BL-16] The vision call uses a deprecated AI SDK image part** — every call logs "The
  "image" content part type is deprecated. Use a "file" part with mediaType". Switch the face
  crop to a `file` part with `mediaType: "image/jpeg"` before the SDK drops it.
  _Refs:_ `apps/web/src/lib/report-text/index.ts`, `openspec/specs/report-text/spec.md` ·
  _Status:_ open — found in `t6-eval-set`, 2026-10-09

- **[BL-40] The web flow samples each passing photo twice** — `checkImage` calls `checkPhoto`,
  which runs `samplePhoto`, then calls `samplePhoto` again for the traits; since
  `t15-white-balance` each run also measures the eye white. Have `checkPhoto` return its sample (or
  traits) and reuse it.
  _Refs:_ `apps/web/src/lib/capture/photo.ts`, `packages/analysis/src/photo-check/index.ts` ·
  _Status:_ open — phase review of `t15-white-balance`, 2026-10-12

## Testing

- **[BL-47] One E2E test fails in the local phase gate** — `report-delivery.spec.ts` "answers a
  report it cannot read with 500" expects `cache-control: private, no-store`, but local
  `pnpm test` serves E2E with `pnpm dev`, which sends `no-cache, must-revalidate`; CI's prebuilt
  server passes. Either set the header explicitly on that route or run that assertion only against
  a production build, so `pnpm test` is green locally.
  _Refs:_ `e2e/report-delivery.spec.ts:112`, `playwright.config.ts` · _Status:_ open — found in `t15-eval-growth`, 2026-10-13

- **[BL-21] Two e2e cases fail on a Mac** — run locally, `/seasons/Soft-Autumn` answers 200
  (the case-insensitive disk serves the prerendered `soft-autumn` page) and, on the dev server
  (no `CI=1`), the report-500 page carries `no-cache, must-revalidate` instead of
  `private, no-store`. CI on Linux passes. Skip or adapt both locally so a clean run is green.
  _Refs:_ `e2e/site-structure.spec.ts`, `e2e/report-delivery.spec.ts`, `playwright.config.ts` ·
  _Status:_ open — found in `t8-photo-privacy`, 2026-10-10

- **[BL-22] A report page's RSC request answered 503 once** — moving from the email step to
  `/r/<id>` on a preview, the `?_rsc` request answered 503 before the page loaded normally.
  Find out whether the router fetched the report before it was readable and whether a visitor
  can see an error.
  _Refs:_ `apps/web/src/app/(report)/`, `openspec/specs/report-page/spec.md` · _Status:_ open —
  network capture of `t8-photo-privacy`, 2026-10-10

- **[BL-42] The citation gate ignores an open change's REMOVED requirements** — the gate reads
  the main specs, so a requirement an unarchived change removes must still be cited until
  archive. Moving its citations to the new anchors (as the change's tasks ask) fails `test:unit`
  and the pre-commit hook until archive. Skip requirements listed under `## REMOVED Requirements`
  in `openspec/changes/*/specs/` (not `archive/`), as the gate already does for ADDED headings.
  It is an edit to an existing test, so it waits for the user's approval.
  _Refs:_ `scripts/__tests__/spec-citations.test.ts` · _Status:_ open — found in
  `t11-no-consent-step`, 2026-10-12

- **[BL-17] Two analysis-eval scenarios are proven one level down** — "A photo cannot be had"
  is tested on the results writer, not on `eval:run` failing after a failed fetch, and "A usable
  photo the model rejects" has no test because its tally sits inline in the paid file. Move the
  tally into `evals/` with a unit test, and test the run's fetch-then-fail order with a stubbed
  fetch.
  _Refs:_ `evals/eval.run.ts`, `apps/web/src/lib/report-text/eval-vision.smoke.ts`,
  `openspec/specs/analysis-eval/spec.md` · _Status:_ open — phase review of `t6-eval-set`,
  2026-10-09

- **[BL-08] Two concurrent email stores are never raced in a test** — the abuse-controls
  scenario "Two requests at once" rests on `store_report_email` locking the report row (`for
update`). PGlite has one connection, so the test only checks that the lock is in the SQL. Race
  two sessions against a real Postgres (the Supabase CLI's local stack), or mark the scenario
  Unenforced.
  _Refs:_ `apps/web/src/lib/email/store.test.ts`, `openspec/specs/abuse-controls/spec.md` ·
  _Status:_ gated — a local Postgres in tests (the local Supabase stack needs Docker)

- **[BL-12] One report-delivery E2E case fails under `pnpm dev`** — "answers a report it cannot
  read with 500" expects `private, no-store`, but the dev server sends `no-cache,
must-revalidate`, so a local `pnpm test:e2e` (dev mode) always shows one failure. The built
  server and CI pass. Skip the header assertion outside the prebuilt mode, or run local E2E
  against a build.
  _Refs:_ `e2e/report-delivery.spec.ts`, `playwright.config.ts` · _Status:_ open — found in
  `t5-funnel-analytics`, 2026-10-09

- **[BL-23] Two copies of the E2E PostHog recorder** — `e2e/posthog.ts` (the sample report's
  "nothing is sent" check) and `funnel.spec.ts` each route the dead PostHog host and decode its
  bodies. Point `funnel.spec.ts` at the shared helper, so a change in posthog-js's body format is
  fixed once. It is an edit to an existing test, so it waits for the user's approval.
  _Refs:_ `e2e/posthog.ts`, `e2e/funnel.spec.ts` · _Status:_ open — found in `t9-site-content`,
  2026-10-10

- **[BL-31] `/seasons/Soft-Autumn` answers 200 in a full local E2E run** — the "not found" test
  for a wrong-case season path fails in the full suite on macOS (on `main` too) but passes alone
  and in CI, likely the case-insensitive file system serving the cached `soft-autumn` page. Make
  the check hold on any file system, or document it as Linux-only.
  _Refs:_ `e2e/site-structure.spec.ts:67` · _Status:_ open — found in `t12-mcp-teaser`, 2026-10-11

## Design / UX

- **[BL-41] The first screen's heading opens with a focus ring** — landing on `/analyze` shows
  the browser's blue outline around "Three things before your selfie". The step effect in
  `flow.tsx` focuses `main h1` (`tabIndex={-1}`) on every step, including the first render, and
  with no click yet the browser treats that programmatic focus as `:focus-visible`. Skip the
  focus on first mount (keep it for step changes, where screen readers need it), and/or drop the
  outline on `h1[tabindex="-1"]:focus`, since a heading is not a control.
  _Refs:_ `apps/web/src/app/(flow)/analyze/flow.tsx` (step focus effect),
  `apps/web/src/app/(flow)/analyze/_capture/steps.tsx` · _Status:_ open — seen on seasonly.me
  mobile, 2026-10-12

- **[BL-38] Swatch names break mid-word in narrow columns** — at six columns on a narrow
  landing (about 800 px wide), "Mushroom" renders as "Mushroo / m" and "Dusty Rose" wraps, because
  `.sn-swatch__name` sets `overflow-wrap: anywhere`. Break at word gaps only (drop that rule,
  or show fewer columns below a width) so a name never splits inside a word.
  _Refs:_ `apps/web/src/components/ds/ds.css`, design system `components/bundle.css` · _Status:_
  open — found with the heading optical-size fix, 2026-10-12

- **[BL-04] The design system's ShareCard overflows on long names** — the approved
  `bundle.css` sets post-card names at 0.75 em, and "Bright Turquoise" needs about 379 px of a
  285 px column at 1080 px. A two-line season name ("Light Summer") also pushes the story card's
  last color into its footer. The PNGs depart from the bundle to fix both (names 0.55 em on one
  line, hex 0.5 em; story rows share the list height). Bring board 11 and `bundle.css` in line,
  so a DOM ShareCard preview on the report matches the PNG.
  _Refs:_ `openspec/specs/share-card/spec.md` (Behavior), MVP canvas board 11
  (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) · _Status:_ deferred — until a page renders a
  DOM card preview (`t5-report-delivery` shows the PNGs themselves); check whether the 2026-10-07
  redesign session already updated the canvas

- **[BL-24] Famous people's names are read twice** — each famous photo's alt text is the
  person's name, and the name is printed right under it, so a screen reader says it twice. Use
  `alt=""` with the name as the caption (a `figure`/`figcaption`), or describe the photo instead;
  the approved alt texts are the names (`t9-site-content` content.json).
  _Refs:_ `apps/web/src/app/(site)/seasons/[season]/page.tsx`, `apps/web/src/lib/site-content/seasons.ts`
  · _Status:_ open — t9 phase review, 2026-10-10

- **[BL-25] Season names in the strips are not headings** — on the landing, `/seasons` and a
  season page's neighbours, each season's name is a `span.h3` inside its link, as the boards draw
  it, so heading navigation skips the 12 seasons. Make them `h3`s if the boards agree.
  _Refs:_ `apps/web/src/lib/site-content/season-link.tsx`, MVP canvas boards Main, Seasons, Season
  · _Status:_ open — t9 phase review, 2026-10-10

- **[BL-26] The famous photos bypass `Slot`** — the season page builds its own `sn-slot` and
  `img` only to add `loading="lazy"`. Give the design system's `Slot` (and bundle.js) a `loading`
  prop and use it there.
  _Refs:_ `apps/web/src/components/ds/slot.tsx`, `apps/web/src/app/(site)/seasons/[season]/page.tsx`
  · _Status:_ open — t9 phase review, 2026-10-10

- **[BL-27] The GPT-alternative page goes stale on December 11** — its title, description, h1
  and lead say the GPT "is retiring" on December 11, 2026. Re-check OpenAI's FAQ and switch the
  copy to the past tense ("has retired") on that date, or sooner if OpenAI moves it.
  _Refs:_ `apps/web/src/lib/site/routes.ts`, `apps/web/src/app/(site)/color-analysis-gpt-alternative/page.tsx`
  · _Status:_ deferred — December 11, 2026 (t9 SEO audit, 2026-10-10)

- **[BL-28] Two redirect hops on legacy URL shapes** — `http://www.seasonly.me/seasons` and
  `/seasons/warm-autumn/` each take two 308s to reach the canonical URL. Harmless on a new domain
  with no inbound links; collapse them at the Vercel domain level if links ever point there.
  _Refs:_ `apps/web/next.config.ts`, Vercel domain settings · _Status:_ deferred — inbound links
  to those shapes (t9 SEO audit, 2026-10-10)

- **[BL-32] Pre-fill `/analyze` from the plugin's answers** — the plugin's link opens the quiz
  fresh, so a chat user answers the four questions twice.
  _Refs:_ `openspec/specs/chat-plugin/spec.md`, `capture-flow` · _Status:_ deferred — if the funnel
  shows drop-off at the quiz for `utm_source=chat-plugin`

- **[BL-33] Rate-limit `/api/mcp`** — the endpoint is public and unauthenticated; a call is pure
  computation, so no limit ships. Add a Vercel firewall rate-limit rule for `/api/mcp`, no code.
  _Refs:_ `apps/web/src/app/api/mcp/route.ts` · _Status:_ deferred — if Vercel usage shows abuse

- **[BL-34] Claude calls the plugin only after a per-chat "Use"** — in claude.ai, a first prompt
  makes Claude search the connector directory, offer a "Use" button and answer from its own
  knowledge; once the user clicks "Use", later prompts call `find_season_family` directly. Host
  behavior for custom connectors (it did not change with "Tools already loaded"); re-check once the
  directory listing is live, and sharpen the tool description only if listed connectors still skip it.
  _Refs:_ `openspec/specs/chat-plugin/spec.md`, `docs/chat-plugin-listing.md` · _Status:_ deferred
  — directory listing live (host check 6.3, 2026-10-11)

- **[BL-35] Claude skips the tool for an all-unsure answer** — positive test case 5 ("I honestly
  can't tell…") made Claude answer itself and link to `/analyze`, because it predicted an empty
  result; ChatGPT called the tool. The no-result card shows only on an explicit request. Either
  accept it or move case 5 to the negative list for Claude.
  _Refs:_ `docs/chat-plugin-listing.md` · _Status:_ open — host check 6.3, 2026-10-11

- **[BL-37] A support page with an HTTPS URL** — both directories ask for a support URL; the site
  has only `care@seasonly.me`, so the listings point to `/terms`, whose last section gives that
  address. A `#contact` anchor or a small support page would be a clearer target.
  _Refs:_ `apps/web/src/app/(site)/terms/page.tsx`, `docs/chat-plugin-listing.md` · _Status:_ open
  — 2026-10-11
