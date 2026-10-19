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

_Next id:_ **BL-105**

**Status** is one of: **open** (actionable now), **gated — X** (blocked on a named decision or
dependency), **deferred — X** (waiting on purpose for a named trigger). Split a multi-part item
into separate items rather than letting one grow into a paragraph.

**What goes here and what doesn't.** Work that a named later change already owns goes in the
plan's "Carried in from finished changes" list (Architecture and phases tab), not here. This file
holds what no change owns yet: phase-review findings left unfixed, and defects or gaps found
along the way that are worth fixing later. CLAUDE.md ("Backlog") says when to add and when to
fold items in.

## Analysis

- **[BL-102] Beauty filters pass the photo check** — the `filter` check flags only skin no
  natural skin has (near-gray, very saturated, or hue outside −10° to 100°), so a soft beauty
  filter that brightens and desaturates skin, like the guide's `filter.webp`, reads as lighter
  natural skin. The eval has no beauty-filtered photo, so no detector can be measured yet.
  _Refs:_ `packages/analysis/src/photo-check/index.ts` (`isFiltered`), `evals/variants.ts`, `backlog-14` design (BL-100) · _Status:_ gated —
  labeled beauty-filtered photos in the eval, or an approved beauty-filter eval variant (`backlog-14` triage, 2026-10-18)

- **[BL-13] Temperature reads cool and moves with the light** — skin hue moves with the light, so
  one person's temperature spreads across photos. The eye-white Lab offset (commit `1d28b3d`) was
  re-run in `backlog-2` triage (2026-10-13) on the current iris-free eye white (reference a\* 6.2,
  b\* 5.8): tuning agreement 0.5733 / 0.5800 / 0.5613 / 0.5513 / 0.5320 and temperature spread
  0.330 / 0.288 / 0.274 / 0.266 / 0.278 at k 0 / 0.25 / 0.5 / 0.75 / 1; holdout agreement 0.550 /
  0.488 / 0.498 / 0.560 / 0.529. No k passes t15-eval-growth's D6 rule (needs tuning +0.023 and
  holdout no worse than −0.036). The other references were swept on 2026-10-16 by replaying the
  MediaPipe cache (k 0 reproduces `results.json` exactly; the balance touches only traits, so
  false-reject and catch are unchanged), each with its tuning-set median as the reference. Rows
  are k 0.25 / 0.5 / 0.75 / 1, k 0 as above (tuning 0.5733, spread 0.330; holdout 0.550, 0.204):
  - teeth (brightest 30% of the inner mouth when brighter than skin; found on 56/116 photos):
    tuning 0.547 / 0.537 / 0.545 / 0.503, spread 0.312 / 0.325 / 0.343 / 0.363; holdout 0.535 /
    0.577 / 0.535 / 0.494, spread 0.172 / 0.150 / 0.151 / 0.164.
  - background (not hair, outside the face box grown 25%, above the chin; clothes leak in):
    tuning 0.512 / 0.479 / 0.475 / 0.464, spread 0.381 / 0.482 / 0.502 / 0.527; holdout 0.431 /
    0.535 / 0.473 / 0.431, spread 0.294 / 0.372 / 0.403 / 0.434.
  - background, near-neutral only (chroma ≤ 8; 55/116): tuning 0.563 / 0.533 / 0.503 / 0.533,
    spread 0.330 / 0.330 / 0.330 / 0.334; holdout 0.550 / 0.488 / 0.488 / 0.488, spread 0.222 /
    0.242 / 0.257 / 0.271.
  - gray-world (mean sRGB of the frame): tuning 0.563 / 0.543 / 0.580 / 0.519, spread 0.317 /
    0.347 / 0.388 / 0.418; holdout 0.473 / 0.435 / 0.498 / 0.456, spread 0.247 / 0.297 / 0.337 /
    0.372.

  None reaches tuning 0.596. Teeth at k 0.5 helps only the holdout. BL-39 caps what any white
  balance can do for label accuracy.
  _Refs:_ `packages/analysis/src/sampling/traits.ts`, `openspec/changes/archive/*-t15-eval-growth/design.md` (D6) · _Status:_ gated —
  more labeled people; eye white, teeth, background and gray-world all fail D6 (2026-10-16)

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
  analysis-eval spec allows another machine; 1 of 4 so far (the first scheduled run, `39233860137`
  on 2026-10-19, fetched and passed; its metric match was not checked), and the spec's drift ("may
  move a metric slightly") needs a number before this can close (backlog-15 triage, 2026-10-19)

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
  sessions) reach the eye-white step after the backlog-1 deploy; 9 so far from 4 people, 0 null (backlog-15 triage, 2026-10-19)

## Privacy

- **[BL-104] Tune the 3 s person-segmenter wait** — `outline()` gives up after a fixed 3 s. Once
  `photo_checked` carries the outline outcome and time (BL-68), set the wait from the late rate and
  the made-time spread.
  _Refs:_ `apps/web/src/lib/capture/photo.ts` · _Status:_ deferred — until about 50 production
  `photo_checked` passes (excluding preview hosts and Oleg's own sessions) carry the outline outcome
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
  _Status:_ deferred — until Sentry shows `crop upload failed` or `outline upload failed` events
  whose cause is `timed out after 3 s`, or storage-js adds a signal to `upload()`; none in 90 days,
  and 2.118.0 and 3.0.0-next.29 still take none (backlog-15 triage, 2026-10-19)

- **[BL-95] The camera start leaves Next's router on `?start=camera`** — `flow.tsx` strips
  `start` with the entry's own state, so Next's router keeps the old address; a later
  `router.refresh` or server action on `/analyze` would write it back, and a reload would reopen
  the camera. Re-sync once Next has patched history (a deferred `replaceState` without `__NA`).
  Also keep any other query or hash instead of the hard-coded `/analyze`.
  _Refs:_ `t20-camera-from-home` design decision 1, `apps/web/src/app/(flow)/analyze/flow.tsx` ·
  _Status:_ deferred — first router refresh or server action on `/analyze`, or a second query
  parameter (BL-32)

## Testing

- **[BL-54] TikTok's in-app browser is untested against the bot check** — Instagram's passed on
  2026-10-17 (camera, analysis and report email on an iPhone, no 403). TikTok shows no tappable bio
  link below 1,000 followers, so nobody reaches its browser yet. Once the link exists, open
  seasonly.me from it on a phone and run one photo; if the check refuses it, decide what the bot
  check lets through.
  _Refs:_ `apps/web/src/app/api/analyze/route.ts` (`checkBotId`), Launch plan step 3 · _Status:_
  deferred — until the TikTok account has 1,000 followers and its bio link

## Design / UX

- **[BL-04] The design system's ShareCard overflows on long names** — the approved
  `bundle.css` sets post-card names at 0.75 em, and "Bright Turquoise" needs about 379 px of a
  285 px column at 1080 px. A two-line season name ("Light Summer") also pushes the story card's
  last color into its footer. The PNGs depart from the bundle to fix both (names 0.55 em on one
  line, hex 0.5 em; story rows share the list height). Bring board 11 and `bundle.css` in line,
  so a DOM ShareCard preview on the report matches the PNG.
  _Refs:_ `openspec/specs/share-card/spec.md` (Behavior), MVP canvas board 11
  (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) · _Status:_ deferred — until a page renders a
  DOM card preview (none as of `backlog-15` triage, 2026-10-19). The canvas `bundle.css` already has
  the post-card sizes (0.55 em, nowrap, hex 0.5 em); only the story rows sharing the list height are
  still missing

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
  _Refs:_ `apps/web/src/app/api/mcp/route.ts` · _Status:_ deferred — if Vercel usage shows abuse;
  about 15 calls in 14 days by Sentry traces, no firewall config yet (backlog-15 triage, 2026-10-19)

- **[BL-34] Claude calls the plugin only after a per-chat "Use"** — in claude.ai, a first prompt
  makes Claude search the connector directory, offer a "Use" button and answer from its own
  knowledge; once the user clicks "Use", later prompts call `find_season_family` directly. Host
  behavior for custom connectors (it did not change with "Tools already loaded"); re-check once the
  directory listing is live, and sharpen the tool description only if listed connectors still skip it.
  _Refs:_ `openspec/specs/chat-plugin/spec.md`, `docs/chat-plugin-listing.md` · _Status:_ deferred
  — directory listing live (host check 6.3, 2026-10-11)
