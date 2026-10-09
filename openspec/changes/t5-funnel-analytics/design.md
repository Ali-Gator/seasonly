## Context

- **PostHog today.** `initPostHog()` (`apps/web/src/lib/observability/posthog.ts`, run from `instrumentation-client.ts`) starts `posthog-js` 1.435 with `defaults: "2025-05-24"`. That turns on:
  - `$pageview` on load and on every change of pathname (`capture_pageview: "history_change"`). The flow's `history.pushState({ depth }, "")` keeps the URL, so it adds no page view; checked in `extensions/history-autocapture.js`, which compares `pathname`.
  - Autocapture of clicks.
  - `person_profiles: "identified_only"`, so anonymous events create no person.

  The project (`Seasonly`, id 290879) has session replay off, `anonymize_ips` on and one test-account filter (a cohort). The cookie stays; no banner (user's choice, 2026-10-09).

- **Events today.** `track(name, props)` in `apps/web/src/lib/capture/events.ts` is a no-op until PostHog has loaded. `flow.tsx` sends `photo_checked`, `analysis_result` and `quiz_no_result`. `capture.test.ts` imports `track` from there and mocks `posthog-js`.
- **The buttons.**
  - Email step: `EmailStep` in `_email/step.tsx` awaits the pure `submitEmail` (kinds `open | invalid | failed`; `open` covers 200 and 429).
  - Report page, `lib/report/actions.tsx`:
    - `ShareButton`, in the header with "Share" and in the actions with "Share my season";
    - the share panel's two Download links;
    - `SaveButton`.

    `shareSeason` returns `shared | panel | idle`. `savePalette` returns `saved | idle` for both the share sheet and the download, and `share.test.ts` asserts that.

  - Premium: `PremiumCard` awaits `tapPremium` (`clicked | failed`).
- **Tests.** Vitest runs in Node with no DOM: component tests render to a string, so no click is ever tested (BL-09 waits on this). E2E has no database or email provider: routes are answered by `page.route`, and `/r/<id>` can only show its 404. Playwright's `NEXT_PUBLIC_*: ""` env has no effect on a `next build` that read `.env.local` first (BL-11).

Motivation: proposal.md. Requirements: `specs/analytics/spec.md`.

## Goals / Non-Goals

**Goals:**

- Every event fires where its outcome is known, in a handler or a promise, never in an effect or a render.
- One place masks report ids, and it covers every event, automatic ones included.
- Each new event is proven by a test that clicks or walks the flow, not by reading the code.

**Non-Goals:**

- Cookie consent or cookieless mode (`t8-photo-privacy`, after the user decides).
- A reverse proxy for ad-blocked browsers. Blocked visitors are simply not counted.
- Server-side events. The browser knows every outcome, as in `t5-analysis-flow`.
- Report ids in Sentry's request URLs. Sentry is restricted to the team; logged to the backlog if the phase review agrees.
- Feature flags (`t7-paywall-off`).

## Decisions

### 1. `lib/analytics` owns `track` and the mask

`track` moves to `apps/web/src/lib/analytics/index.ts`, beside `maskReportIds`. `lib/capture/events.ts` keeps `photoCheckedProps` and re-exports `track`, so `capture.test.ts` stays unedited (an edit to an existing test needs the user's approval). The report and interest code import from `@/lib/analytics`, not from `capture`. The README row at archive is `apps/web/src/lib/analytics/**`.

Alternative: leave `track` in `capture`. Rejected: the report page would import from the capture flow's folder for a helper that has nothing to do with photos.

### 2. Mask in `before_send`, over every string

`initPostHog` passes `before_send: maskReportIds`. It walks the event's `properties`, `$set` and `$set_once` and rewrites, in every string, `/r/` followed by exactly 22 id characters (`REPORT_ID`'s class `[A-Za-z0-9_-]`, not followed by another) to `/r/:id`. Nested arrays and objects are walked too, so `$elements`, `$elements_chain`, `$current_url`, `$pathname`, `$referrer`, `$prev_pageview_pathname` and `$initial_*` are all covered without a list to keep up to date. The pattern is written out in `lib/analytics` rather than imported from `lib/draping/crops.ts`, which imports the server Supabase client. A test pins the two patterns together.

Alternatives:

- `sanitize_properties` is deprecated in favor of `before_send`.
- PostHog's path-cleaning rules (a project setting) clean only at query time, so the raw id would still be stored.
- Masking only the URL properties misses element text and attributes.

### 3. Where each event fires

| Event                   | Where                                     | How                                                                                    |
| ----------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `consent_answered`      | `flow.tsx`, `onAgree` / `onDecline`       | before the dispatch                                                                    |
| `quiz_completed`        | `flow.tsx`, `onNext`                      | when the step is the last question and it has an answer, the reducer's own guard       |
| `analysis_failed`       | `flow.tsx`, the analyze effect's `.catch` | only when `!left`, so Back and StrictMode's aborted first run send nothing             |
| `report_requested`      | `flow.tsx`, `onReport`                    | before `open-email`                                                                    |
| `email_submitted`       | `EmailStep.onSubmit`                      | on `open`, before `router.push`                                                        |
| `share_tapped`          | `ShareButton.onClick`                     | after `shareSeason`; `idle` is sent as `cancelled`; a new `place` prop                 |
| `share_card_downloaded` | the panel's Download `<a>`                | `onClick`                                                                              |
| `palette_saved`         | `SaveButton.onClick`                      | on `saved`; `method` is `download` when the `download` closure ran, else `share-sheet` |
| `premium_tapped`        | `PremiumCard.onTap`                       | on `clicked`                                                                           |

`submitEmail` is unchanged; `email_submitted` carries nothing that would need the 429 told apart from 200. `savePalette`'s signature and return stay as they are, and `share.test.ts` is untouched.

Alternative for `palette_saved`: return `shared | downloaded | idle` from `savePalette`. Rejected: it edits an existing test's assertions for a property the caller can see already.

### 4. E2E sees PostHog through a dead host

The E2E server gets a test key and `NEXT_PUBLIC_POSTHOG_HOST=http://127.0.0.1:9`, the dead address the Supabase URL already uses.

- A new `e2e/funnel.spec.ts` routes `http://127.0.0.1:9/**`. It decodes each capture body: JSON, or gzip when the URL says `compression=gzip-js`. It then polls until the expected events are in, in order: landing → header "Find my colors" → upload → agree → quiz → reveal (analyze route answered) → "Get my full report" → address (email route answered) → `/r/e2e-report`.
- That report shows its 404 page, but its `$pageview` still proves the mask.
- In other specs the requests fail quietly, and `posthog-js` drops them.

For BL-11, `playwright.config.ts` holds one `E2E_ENV`: the dead Supabase URL, empty secrets, the empty Sentry DSN, and the PostHog test key and host.

- Prebuilt mode runs `pnpm build && pnpm start` with that env, so the build reads it, not `.env.local`. Variables already set win over `.env.local`, empty ones too.
- `e2e.yml` drops its own `pnpm build` step, and the web server's timeout grows to cover the build.

A local `CI=1 pnpm test:e2e` then reports nothing to production Sentry or PostHog.

Alternative: keep PostHog off in E2E and test only the prop builders. Rejected: the exit check is "fires one event", which only a run that counts requests shows.

### 5. jsdom for the report's buttons

`jsdom` becomes a root dev dependency. Component tests opt in with `// @vitest-environment jsdom` at the top of the file, and the rest of the suite stays in Node. They render with `react-dom/client` inside `act`, click real elements, and use `vi.mock("posthog-js")` as `capture.test.ts` does, with `__loaded: true`.

`navigator.share` and `canShare` are stubbed per case. `fetch` is stubbed for the prefetched PNG and for the interest route.

New files: `actions.dom.test.tsx` for share, download and save, and `premium-card.dom.test.tsx`. The email step's event goes in the E2E, which already walks it. BL-09's draping fallback test joins as `draping.dom.test.tsx`.

Alternative: a separate jsdom Vitest project. Rejected: one directive per file needs no config change.

### 6. The funnel in PostHog, through the connector

Once production has the events, with the user's yes at that moment:

- an action "Shared or saved" (three steps);
- a funnel insight "Landing to share" with the steps the spec lists (Consent optional), a 7-day conversion window, ordered, filtered to `$host = seasonly.me`, with test accounts filtered out;
- a tile on the Seasonly dashboard (id 989985).

No project setting changes.

## Risks / Trade-offs

- [Ad blockers drop PostHog requests] → Counts are a floor, not a census. The demand gate's 300 analyses are counted from `reports`, not from PostHog. A reverse proxy can come later.
- [Cookies without consent for EU visitors] → The user's choice, and carried to `t8-photo-privacy` with the banner or cookieless option.
- [An id in another shape escapes the mask (URL-encoded, as in a `?ref=%2Fr%2F…`)] → Nothing on the site writes one. The ceiling is noted in the code.
- [Dev StrictMode doubles effects] → No event fires from an effect except `analysis_failed`, which the `left` guard drops on the aborted first run.
- [The E2E build now takes place inside Playwright's web-server start] → Its timeout is raised; CI's total time is unchanged, since the separate build step goes.
- [`posthog-js` changes its body format] → The E2E helper handles JSON and gzip. A third format fails the test loudly, not silently.

## Migration Plan

Ship as one PR. Events start on the next production deploy. Rollback is a revert; nothing in PostHog depends on the code except the insight, which simply stops filling.
