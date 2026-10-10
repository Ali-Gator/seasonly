# analytics Specification

## Purpose

Measures the funnel from landing to share in PostHog, one event per step, so the demand gate and the share and email opt-in rates can be read, without sending PostHog anything that identifies a person or opens their report.

## Public Interface

```typescript
// apps/web/src/lib/analytics/index.ts (client)
export function track(name: string, props: Record<string, unknown>): void; // no-op until posthog-js has loaded
export const maskReportIds: BeforeSendFn; // posthog-js before_send; null passes through

// apps/web/src/lib/observability/posthog.ts
// initPostHog() passes { before_send: maskReportIds, advanced_disable_flags: true }

// apps/web/src/lib/report/actions.tsx
export function ShareButton(props: { /* … */ place?: "header" | "actions" }): JSX.Element; // default "actions"
```

| Event                   | Fired from                                         | Properties                                                     |
| ----------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| `consent_answered`      | `flow.tsx`, the consent step's agree and decline   | `agreed`                                                       |
| `quiz_completed`        | `flow.tsx`, Next on the last question, answered    | `quiz_only` (`state.quizOnly`)                                 |
| `analysis_failed`       | `flow.tsx`, the analyze request's `.catch`         | `quiz_only` (`!request.photo`); not when `left` (Back)         |
| `report_requested`      | `flow.tsx`, "Get my full report" with a report id  | `quiz_only` (`agreement === "quiz-only"`)                      |
| `email_submitted`       | `_email/step.tsx`, on `open`, before `router.push` | none                                                           |
| `share_tapped`          | `ShareButton`, after `shareSeason`                 | `place`, `outcome` (`shared`, `panel`, `cancelled` for idle)   |
| `share_card_downloaded` | the share panel's Download links                   | `ratio` (`story`, `post`)                                      |
| `palette_saved`         | `SaveButton`, on `saved`                           | `method` (`download` when the closure ran, else `share-sheet`) |
| `premium_tapped`        | `PremiumCard`, on `clicked`                        | none                                                           |

## Behavior

- `maskReportIds` walks an event's `properties`, `$set` and `$set_once`: every string, object key (`$heatmap_data` is keyed by URL) and nested array or plain object. In each string, `/r/`, `/api/face/` or `/api/reports/` followed by exactly 22 characters of `[A-Za-z0-9_-]`, not followed by another, becomes `/r/:id` (`/api/face/:id`, `/api/reports/:id`). The pattern is written out rather than imported from `lib/draping/crops.ts` (server client); a test pins it to `REPORT_ID`.
- PostHog flags are off (`advanced_disable_flags`): the flags request sends the first page's URL as `$initial_*` person properties outside `before_send`. Nothing reads a flag yet.
- No code calls `identify`, `alias`, `register` or `setPersonProperties`, or passes `$set`; a test scans `apps/web/src`.
- The funnel is the saved insight [Landing to share](https://eu.posthog.com/project/290879/insights/u9u1pu2U) (`u9u1pu2U`) on dashboard 989985, with the action "Shared or saved" (166067). Landing is a `$pageview` whose `$pathname` does not match `^/(analyze$|r/)`.
- E2E: `playwright.config.ts` builds and serves with `E2E_ENV`, whose PostHog key is `phc_e2e` on the dead host `http://127.0.0.1:9`. `e2e/funnel.spec.ts` routes that host, decodes each body (gzip by its magic bytes, base64 form data, or JSON) and orders events by timestamp. posthog-js drops events from a likely bot, so that spec sets a phone user agent and clears `navigator.webdriver` and `userAgentData`; every other spec sends no PostHog request.
- Checked on a preview deployment 2026-10-09 from a phone (quiz-only path): every event arrived with its expected properties, under one `distinct_id`, and none held a report id or the address.

## Edge Cases

- An encoded id (`%2Fr%2F…`) passes the mask; nothing on the site writes one.
- Ad blockers drop PostHog requests, so counts are a floor. The demand gate counts analyses from `reports`.
- PostHog keeps its first-party cookie without a consent banner (the user's choice, 2026-10-09), disclosed on `/privacy` (backlog: cookieless mode or a banner before paid promotion or a complaint).
- Sentry receives report ids (`extra.reportId`, request URLs) on purpose (the user's choice, 2026-10-09), disclosed on `/privacy`.
- Turning flags on needs the first page's URL masked first; carried to `t7-paywall-off`.

## Requirements

### Requirement: Each funnel step fires one event

Each step from landing to share SHALL be recorded by exactly one PostHog event per time the person reaches it:

| Step             | Event                                                      | Fires when                                           |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Landing          | `$pageview` with a path other than `/analyze` and `/r/:id` | a site page is shown                                 |
| Flow start       | `$pageview` with path `/analyze`                           | the photo guide is shown                             |
| Photo checked    | `photo_checked`                                            | as `capture-flow` requires                           |
| Consent          | `consent_answered`                                         | the person agrees or declines on the consent step    |
| Quiz done        | `quiz_completed`                                           | the person leaves the last question with an answer   |
| Result           | `analysis_result`, `quiz_no_result` or `analysis_failed`   | as `season-reveal` requires; `analysis_failed` below |
| Report asked for | `report_requested`                                         | the person chooses "Get my full report"              |
| Email given      | `email_submitted`                                          | the address is stored and the report opens           |
| Report opened    | `$pageview` with path `/r/:id`                             | a report page is shown                               |
| Shared or saved  | `share_tapped`, `share_card_downloaded`, `palette_saved`   | below                                                |
| Premium interest | `premium_tapped`                                           | interest is recorded                                 |

An event SHALL fire from the person's action or from the outcome it reports, never from a render: showing a step again, or rendering it twice, SHALL NOT fire it again. With PostHog off, no event SHALL be sent and every step SHALL work the same.

#### Scenario: From landing to the report

- **WHEN** a person opens the landing page, starts the flow, uploads a photo that passes, agrees, answers the quiz, gets a result, chooses "Get my full report" and gives an address
- **THEN** PostHog receives, in order, `$pageview` (`/`), `$pageview` (`/analyze`), `photo_checked`, `consent_answered`, `quiz_completed`, `analysis_result`, `report_requested`, `email_submitted` and `$pageview` (`/r/:id`), each once

#### Scenario: Back to a step already seen

- **WHEN** the person goes Back from the email step to the reveal and forward again with "Get my full report"
- **THEN** `report_requested` fires a second time, for the second tap, and `analysis_result` does not

#### Scenario: PostHog off

- **WHEN** the flow runs without a PostHog key
- **THEN** no request reaches PostHog and the person reaches the report as before

### Requirement: The flow's new events carry only their outcome

- `consent_answered` SHALL carry `agreed`: true or false.
- `quiz_completed` SHALL carry `quiz_only`: true when no photo will be sent.
- `analysis_failed` SHALL fire when the analysis request fails or times out while the person is still waiting for it, and SHALL carry `quiz_only`. It SHALL NOT fire when the person leaves the analyzing step by Back.
- `report_requested` SHALL carry `quiz_only`.

None of them SHALL carry the answers, the image, the season's text or the report id.

#### Scenario: Declining consent

- **WHEN** the person chooses not to upload on the consent step
- **THEN** one `consent_answered` event is sent with `agreed` false

#### Scenario: The analysis times out

- **WHEN** the analysis request gets no answer within the client's limit
- **THEN** one `analysis_failed` event is sent and the error step is shown

#### Scenario: Back while analyzing

- **WHEN** the person goes Back while the analysis is running
- **THEN** no `analysis_failed` event is sent

### Requirement: The email event never carries the address

`email_submitted` SHALL fire once per sent address that opens the report, a report that already has its 3 addresses included, and SHALL carry no properties of its own. It SHALL NOT fire for an address refused on the device or a failed send. It SHALL NOT carry the address or any part of it, its domain included.

#### Scenario: A valid address

- **WHEN** a person sends a valid address and the report opens
- **THEN** one `email_submitted` event is sent and no property holds the address or its domain

#### Scenario: A typo

- **WHEN** a person sends an address the device refuses
- **THEN** no `email_submitted` event is sent

### Requirement: Share and save events carry how they ended

- `share_tapped` SHALL fire on each tap of "Share my season" or the header's "Share", with `place` (`header` or `actions`) and `outcome`: `shared` when the share sheet completed, `panel` when the share panel opened instead, `cancelled` when the person closed the share sheet.
- `share_card_downloaded` SHALL fire on each tap of a share panel's Download, with `ratio` (`story` or `post`).
- `palette_saved` SHALL fire when "Save my palette" saves the image, with `method` (`share-sheet` or `download`). A cancelled share sheet SHALL send nothing.
- `premium_tapped` SHALL fire once interest is recorded, and SHALL NOT fire for a failed tap.

None of them SHALL carry the report id or the address.

#### Scenario: Sharing from a phone

- **WHEN** a person taps "Share my season" on a phone whose share sheet accepts files and completes the share
- **THEN** one `share_tapped` event is sent with `place` `actions` and `outcome` `shared`

#### Scenario: Sharing from a laptop

- **WHEN** a person taps "Share my season" in a browser that cannot share files, then "Download" under the post card
- **THEN** `share_tapped` is sent with `outcome` `panel`, then `share_card_downloaded` with `ratio` `post`

#### Scenario: Saving by download

- **WHEN** a person taps "Save my palette" in a browser that cannot share files
- **THEN** one `palette_saved` event is sent with `method` `download`

#### Scenario: A failed Premium tap

- **WHEN** the interest route fails
- **THEN** no `premium_tapped` event is sent

### Requirement: No report id reaches PostHog

Before any event leaves the browser, every `/r/<report id>` in any of its properties, nested ones included (the page URL, path, referrer, previous page, initial URL and referrer, and the clicked element's text and attributes), SHALL be replaced by `/r/:id`, and `/api/face/<report id>` and `/api/reports/<report id>` likewise by `/api/face/:id` and `/api/reports/:id`. This SHALL hold for every event, automatic ones included. No other request to PostHog SHALL carry a report id: while the flags request would send the first page's URL outside this mask, the app SHALL NOT send it.

#### Scenario: A page view of a report

- **WHEN** a report page is shown
- **THEN** PostHog receives a `$pageview` whose URL and path end in `/r/:id`, and no property holds the report id

#### Scenario: An automatic event with the id in an element

- **WHEN** an autocaptured click's element text or attributes hold `seasonly.me/r/<id>`
- **THEN** the event is sent with `seasonly.me/r/:id` in their place

#### Scenario: Leaving the report for the landing page

- **WHEN** a person goes from a report to the landing page
- **THEN** the landing page's `$pageview` has the previous page path `/r/:id`

### Requirement: No person is identified

The app SHALL NOT identify a person to PostHog, nor set person properties, from an address, a report or anything else. Events stay with PostHog's anonymous id.

#### Scenario: After the email step

- **WHEN** a person gives an address and opens the report
- **THEN** no `$identify` or `$set` event is sent, and the following events keep the same anonymous id

### Requirement: The funnel is saved in PostHog

The PostHog project SHALL hold a funnel insight "Landing to share" on the Seasonly dashboard. Its steps SHALL be those of "Each funnel step fires one event" from Landing to Shared or saved, with:

- Photo checked as any `photo_checked`, since a quiz-only result follows two failed checks;
- Consent as a `consent_answered` with `agreed` true, optional, since the quiz-only path skips it;
- Result as an `analysis_result` with the outcome `result`;
- Shared or saved as one action: `share_tapped` with the outcome `shared`, `share_card_downloaded` or `palette_saved`.

It SHALL be filtered to the host `seasonly.me`, with test accounts filtered out. Premium interest and failed analyses are read beside it, not as steps.

**Unenforced:** the insight is a setting in the PostHog project, not app behavior; it is made and checked by hand through the PostHog connector, and its link is recorded in the change's tasks.

#### Scenario: Reading the funnel

- **WHEN** the dashboard is opened
- **THEN** "Landing to share" shows each step's conversion for production traffic only
