## Why

The demand gate (300 completed analyses in 30 days, with share and email opt-in rates tracked alongside) and the concept's metrics (visitor-to-teaser rate, share rate) need a funnel. PostHog has been live since Phase 0, but it sees only page views, autocaptured clicks and three analysis events (`photo_checked`, `analysis_result`, `quiz_no_result`). `t5-report-delivery` shipped the email step, share, save and Premium buttons and sent no event from them. Phase 1 table: `t5-funnel-analytics` creates `analytics`, with the exit check "Each funnel step from landing to share fires one PostHog event".

It also closes a leak found while planning. Autocaptured page views and clicks on `/r/<id>` carry the report id in `$current_url`, `$pathname`, `$referrer` and `$initial_*`. That id is the only key to a person's report: their face crop, and the address shown in the Premium note.

## What Changes

- **One funnel, landing to share.** Each step is one PostHog event:

  | Step             | Event                                                    | Status                |
  | ---------------- | -------------------------------------------------------- | --------------------- |
  | Landing          | `$pageview`                                              | exists (autocaptured) |
  | Flow start       | `$pageview` on `/analyze`                                | exists                |
  | Photo checked    | `photo_checked`                                          | exists                |
  | Consent          | `consent_answered`                                       | new                   |
  | Quiz done        | `quiz_completed`                                         | new                   |
  | Result           | `analysis_result` (or the new `analysis_failed`)         | exists, plus new      |
  | Report asked for | `report_requested`                                       | new                   |
  | Email given      | `email_submitted`                                        | new                   |
  | Report opened    | `$pageview` on `/r/:id`                                  | exists, id masked     |
  | Shared or saved  | `share_tapped`, `share_card_downloaded`, `palette_saved` | new                   |
  | Premium interest | `premium_tapped`                                         | new                   |

  Events fire from the tap or the outcome they report, never from a render, so a step fires once.

- **Nothing identifying reaches PostHog.** No event carries:
  - the email address, or any part of it;
  - the report id;
  - the image, the crop or the personal text.

  Every `/r/<id>` in any property (URLs, referrers, element text) becomes `/r/:id` before an event leaves the browser. No `identify` call, and no person properties.

- **The funnel itself.** A saved "Landing to share" funnel insight on the Seasonly dashboard, filtered to `seasonly.me` so preview traffic stays out, made through the PostHog connector after the user's yes.
- **Tests that see the events.**
  - The E2E build gets a test PostHog key whose host the tests intercept, so the flow's funnel is checked end to end.
  - The report page's buttons get component tests in jsdom (new dev dependency), since CI has no database to render `/r/<id>`.
- **Cookies stay as they are.** PostHog keeps its first-party cookie, and no banner ships (user's choice, 2026-10-09). The consent decision, possibly a banner, is carried to `t8-photo-privacy`.
- **Folded in from `docs/backlog.md`:**
  - BL-11: the E2E server is built with its own public keys. A local `pnpm build` no longer bakes the production Sentry DSN or PostHog key into E2E runs.
  - BL-09: with jsdom available, a test fires `error` on the draping image and checks that the fallback appears.

## Capabilities

### New Capabilities

- `analytics`: the funnel's events, what each carries and when it fires; what never reaches PostHog (address, report id, image, personal text), with report ids masked in every property; the saved funnel insight.

### Modified Capabilities

None. The new events fire from code owned by `capture-flow`, `season-reveal`, `email-capture`, `report-page` and `interest-button`, but their requirements do not change; the event contract lives in `analytics`. Existing events (`photo_checked`, `analysis_result`, `quiz_no_result`) keep their requirements where they are.

## Impact

- **Code**
  - `apps/web/src/lib/analytics/` (new): `track` moves here from `lib/capture/events.ts`, which re-exports it; the report-id mask passed to PostHog as `before_send`.
  - `apps/web/src/lib/observability/posthog.ts`: `initPostHog` installs the mask.
  - `apps/web/src/app/(flow)/analyze/flow.tsx`: consent, quiz, failed-analysis and report-requested events.
  - `apps/web/src/app/(flow)/analyze/_email/step.tsx`: `email_submitted`.
  - `apps/web/src/lib/report/actions.tsx`: share, card download and save events.
  - `apps/web/src/lib/interest/premium-card.tsx`: `premium_tapped`.
- **Tests**
  - A jsdom environment for component tests.
  - A funnel E2E that records the PostHog requests.
  - `playwright.config.ts` and `.github/workflows/e2e.yml` build and serve with test keys (BL-11).
- **Dependencies:** `jsdom` (dev only).
- **Env:** no new variable. The E2E build sets `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` and `NEXT_PUBLIC_SENTRY_DSN` itself.
- **PostHog (with the user's yes):** one action "Shared or saved", one funnel insight and its dashboard tile. No project setting changes.
- **Downstream**
  - `t8-photo-privacy`: decide on cookie consent for PostHog (a banner, or cookieless mode), and name PostHog and what it receives on the privacy page.
  - `t7-paywall-off`: the paywall's unlock becomes a funnel step after `report_requested`; its flag reads PostHog as today.
