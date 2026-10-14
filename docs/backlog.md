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

_Next id:_ **BL-65**

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
  one person's temperature spreads across photos. The eye-white Lab offset (commit `1d28b3d`) was
  re-run in `backlog-2` triage (2026-10-13) on the current iris-free eye white (reference a\* 6.2,
  b\* 5.8): tuning agreement 0.5733 / 0.5800 / 0.5613 / 0.5513 / 0.5320 and temperature spread
  0.330 / 0.288 / 0.274 / 0.266 / 0.278 at k 0 / 0.25 / 0.5 / 0.75 / 1; holdout agreement 0.550 /
  0.488 / 0.498 / 0.560 / 0.529. No k passes t15-eval-growth's D6 rule (needs tuning +0.023 and
  holdout no worse than −0.036). Find a white reference that holds on the holdout (background,
  teeth, gray-world are untried) or grow the set.
  _Refs:_ `packages/analysis/src/sampling/traits.ts`, `openspec/changes/archive/*-t15-eval-growth/design.md` (D6) · _Status:_ gated —
  a new white reference to try, or more labeled people; the eye white fails D6 on both measures (backlog-2 triage, 2026-10-13)

- **[BL-39] Skin hue barely separates warm and cool labels** — on the 26 tuning people,
  warm-labeled people average skin hue 49.2° and cool-labeled 46.9°, a 2.3° gap against a 9.2°
  person SD, so temperature cannot carry label accuracy (0.1765 tuning, 0.0588 holdout) whatever
  the white balance does. Look for
  another warm/cool cue (hair, eyes, lips, or the quiz) before tuning temperature further.
  _Refs:_ `packages/analysis/src/sampling/traits.ts`, `evals/README.md` · _Status:_ gated — more
  labeled people, or quiz answers recorded for the eval people: on 119 tuning photos every local
  cue tried (iris, lips, hair, skin re-centring) moves exact metrics a photo or less (backlog-1
  triage, 2026-10-13); still 26 tuning / 8 holdout people and no quiz answers in the manifest
  (backlog-2 triage, 2026-10-13)

- **[BL-49] Gate the eval on the CI run** — the weekly `eval-weekly.yml` run only reports its
  metrics beside the committed `results.json`. Once it has proved stable, make CI hold a change to
  a fresh run instead of the committed result.
  _Refs:_ `.github/workflows/eval-weekly.yml`, `evals/gate.ts` · _Status:_ deferred — until four
  consecutive weekly runs fetch cleanly and match the committed metrics within the drift the
  analysis-eval spec allows another machine

- **[BL-50] Re-sweep the eye-white tint limit on the new measure** — `MAX_EYE_WHITE_CHROMA`
  (C\*ab 22) was tuned on the old brightest-40% eye white; tuning `tint` false rejects are 12 of 27.
  Swept in `backlog-2` triage (2026-10-13), C\*ab 20–32 in 0.1 steps, tuning set: every limit
  above 22 lowers agreement (0.5733 → 0.5700 at 22.1, 0.5567 at 22.2–22.6, 0.5527 at 22.7–23.5),
  and catch holds only to 22.7 with no copies of margin (tint false rejects 12 → 8 there). No
  limit keeps all four ratchets. Re-sweep when the set grows or the cast measure changes.
  _Refs:_ `packages/analysis/src/photo-check/index.ts`, `openspec/changes/archive/*-backlog-1/design.md` (Decision 4) · _Status:_ gated —
  more labeled photos, or a new cast measure; no limit holds agreement on today's set (backlog-2 triage, 2026-10-13)

- **[BL-51] A squint can pass the light checks unmeasured** — with 478 landmarks the eye white is
  null when fewer than 50 opening pixels lie outside the irises, and `dark` and `tint` are then
  skipped (`p07/6` moved from `dark` to a pass). Watch the null rate of `eye_white_lab` after the
  deploy; if real squints pass unmeasured, add a retake rule for a null eye white.
  Once it fires, the fix needs a new retake screen on the MVP canvas and reverses the photo-check
  requirement "Eye whites that cannot be measured do not reject a photo".
  _Refs:_ `packages/analysis/src/sampling/index.ts`, `openspec/changes/archive/*-backlog-1/design.md` · _Status:_ deferred —
  until about 50 production `photo_checked` events (PostHog, excluding preview hosts and Oleg's own
  sessions) reach the eye-white step after the backlog-1 deploy; 1 so far, 0 null (backlog-2 triage, 2026-10-13)

## Privacy

- **[BL-53] The draping preview shows the photo's own background** — the stored face crop keeps
  the wall or window behind the face, which shows at the oval's edges on both colors. Remove the
  background from the crop (the hair segmenter the photo check loads can make the mask), so only
  the face sits on the color. It changes what is uploaded and stored, so a privacy review comes
  first.
  _Refs:_ `apps/web/src/lib/capture/photo.ts` (`cropBox`), `openspec/specs/draping-preview/spec.md`,
  `t18-design-review` design.md (Non-Goals) · _Status:_ gated — its own change: a privacy sign-off,
  a mask source (the hair segmenter is hair-vs-rest and cannot separate face from wall; the multiclass
  selfie segmenter or the face-oval contour can), an alpha crop format (the crop path is JPEG-only),
  canvas boards 10/18 redrawn, and an approved paid `eval:vision` run (backlog-5 triage, 2026-10-14)

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

- **[BL-60] A passing check's traits are optional in the type** — `PhotoCheck.traits?` lets a
  stand-in `check` (eval `RunOptions.check`) pass with no traits, and `analyze` then records a pass
  with no season instead of failing; `checkImage` and `analyze` both need `?? null`. Make
  `PhotoCheck` a union whose pass case requires `traits`.
  _Refs:_ `packages/analysis/src/photo-check/index.ts`, `evals/pipeline.ts`, `apps/web/src/lib/capture/photo.ts` · _Status:_ open — phase review of `backlog-2`, 2026-10-13

## Testing

- **[BL-54] TikTok's and Instagram's in-app browsers are untested against the bot check** — a
  403 now shows the blocked screen, but nobody has opened seasonly.me inside either app and run a
  photo. Run it once on a phone after `t18-design-review` ships (one paid vision call), and if the
  check refuses them, decide what the bot check lets through.
  _Refs:_ `apps/web/src/app/api/analyze/route.ts` (`checkBotId`), `t18-design-review` tasks.md
  8.3 · _Status:_ deferred — until t18 is on seasonly.me (the preview sits behind Vercel login)

- **[BL-47] One E2E test fails in the local phase gate** — `report-delivery.spec.ts` "answers a
  report it cannot read with 500" expects `cache-control: private, no-store`, but local
  `pnpm test` serves E2E with `pnpm dev`, which sends `no-cache, must-revalidate`; CI's prebuilt
  server passes. Either set the header explicitly on that route or run that assertion only against
  a production build, so `pnpm test` is green locally.
  _Refs:_ `e2e/report-delivery.spec.ts:112`, `playwright.config.ts` · _Status:_ open — found in `t15-eval-growth`, 2026-10-13

- **[BL-59] Local E2E times out on a loaded Mac** — with load average ~9, a full local
  `pnpm test:e2e` fails a different set of flow tests each run on their 30 s limits (funnel,
  analysis-flow), on `main` too (3 failed, 6 flaky); alone, each passes in ~10 s, and CI is green.
  Cap local workers or raise the dev-mode timeouts, so the local phase gate reads true.
  _Refs:_ `playwright.config.ts`, `e2e/funnel.spec.ts`, `e2e/analysis-flow.spec.ts` · _Status:_ open — found in `backlog-2`, 2026-10-13

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

- **[BL-64] `view.test.tsx` writes its footer helper twice** — "has no photo line in a quiz-only
  footer" declares `footer` inline and "names Google's copy in a photo report's footer" repeats
  the same regex. Hoist one `footer` helper to file scope; it edits an existing test, so it needs
  the test edit approved.
  _Refs:_ `apps/web/src/lib/report/view.test.tsx` · _Status:_ open — `backlog-4` phase review, 2026-10-14

## Design / UX

- **[BL-61] "Watermelon" still runs into the gap at 375–399 px** — a 4-column cell is
  (W − 100) / 4, so at 375 px Watermelon (74.9 px at 13 px) runs about 6 px into the 12 px gap in
  columns 1–3 (Light Spring best #6, Bright Winter #1, Light Summer #20); it fits from about 400 px.
  The approved 375 board shows Soft Autumn, whose names fit, so the fix changes the approved 375
  layout: a 375 board with a Light Spring palette first. `backlog-3` covers only below 375; a
  container query on cell width, not viewport width, would cover both in one rule.
  _Refs:_ `apps/web/src/components/ds/ds.css` (`.sn-swatch__name`), MVP canvas board 10 · _Status:_ gated — a Light Spring 375/390 board (`backlog-3`'s below-375 column rule
  is the base; option 1 moves that breakpoint to ~404 px). Also hit:
  390/393 px iPhones, True Summer best #16, Champagne in Light Spring metals (`backlog-4` triage, 2026-10-14)

- **[BL-63] The swatch grid's `!important` column rule beats Tailwind's `!` utilities** —
  `SwatchGrid` sets its column count inline, so the below-375 rule in `ds.css` needs
  `!important`, and inside `@layer components` that wins over any `grid-cols-N!` utility, so a
  future override on a 4-column grid loses silently below 375 px. Set a `--sn-cols` custom
  property instead and read it in `.sn-swatch-grid`; then neither the narrow rule nor the
  `lg:grid-cols-N!` bangs need `!important`, and `data-columns` could become a 4-only marker.
  Changes the inline-style tests in `ds.test.tsx`, so it needs the test edit approved.
  _Refs:_ `apps/web/src/components/ds/swatch.tsx`, `apps/web/src/components/ds/ds.css` · _Status:_ open — `backlog-3` phase review, 2026-10-14

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
