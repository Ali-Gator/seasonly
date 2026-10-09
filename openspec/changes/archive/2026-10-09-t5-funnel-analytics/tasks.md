## 1. Setup

- [x] 1.1 Add `jsdom` as a root dev dependency (`pnpm add -Dw jsdom`). Done when a throwaway `// @vitest-environment jsdom` test sees `document` and `pnpm test:unit` still runs every other file in Node. Delete the throwaway test.

## 2. Tests first

Cite scenarios at `openspec/specs/analytics/spec.md#…`. Add new files or new cases; edit no existing assertion without the user's approval.

- [x] 2.1 `apps/web/src/lib/analytics/analytics.test.ts` (Node):
  - `maskReportIds` rewrites `/r/<22 id chars>` to `/r/:id`:
    - in `$current_url`, `$pathname`, `$referrer`, a nested `$elements[].$el_text`, `$elements_chain` and `$set_once.$initial_current_url`;
    - in every occurrence within one string.
  - It leaves alone `/r/` followed by 21 or 23 id characters, and strings with no id.
  - Its pattern accepts exactly what `REPORT_ID` accepts, on generated ids.
  - `initPostHog` with a key passes `before_send: maskReportIds` (mocked `posthog-js`).
  - No file under `apps/web/src` calls `identify`, `setPersonProperties`, `alias` or `register` on PostHog, or passes `$set`.

  Done when the file fails against the current code, because `lib/analytics` does not exist.

- [x] 2.2 `apps/web/src/lib/report/actions.dom.test.tsx` (jsdom), with `posthog-js` mocked as loaded:
  - "Share my season" with a share sheet that resolves sends one `share_tapped` `{ place: "actions", outcome: "shared" }`;
  - the header "Share" with one that rejects with `AbortError` sends `{ place: "header", outcome: "cancelled" }`;
  - with no `canShare`, the tap sends `outcome: "panel"`, and the panel's post Download sends `share_card_downloaded` `{ ratio: "post" }`;
  - "Save my palette" sends `palette_saved` with `method: "share-sheet"` through the sheet and `"download"` without it, and nothing when the sheet is cancelled.

  No property holds the report id. Done when it fails for the missing events.

- [x] 2.3 `apps/web/src/lib/interest/premium-card.dom.test.tsx` (jsdom). A tap whose route answers 200 sends one `premium_tapped`, and a 500 sends none. Done when it fails for the missing event.
- [x] 2.4 BL-09: `apps/web/src/lib/report/draping.dom.test.tsx` (jsdom). Firing `error` on the face image of `ReportDraping` shows the deleted-photo fallback. Cite `openspec/specs/report-page/spec.md`'s draping-fallback scenario. Done when it passes against the current code, since the behavior already ships.
- [x] 2.5 `e2e/funnel.spec.ts` on a phone viewport, with `http://127.0.0.1:9/**` routed and each capture body decoded (JSON, or gzip on `compression=gzip-js`):
  1. `/` → header "Find my colors" → upload the fixture face → "Agree and upload" → 4 answers → "See my result" (analyze route answered with a result and a well-formed 22-character `reportId`) → "Get my full report" → a valid address (email route answered 200);
  2. poll until the received events, in order, are `$pageview` `/`, `$pageview` `/analyze`, `photo_checked`, `consent_answered` (`agreed: true`), `quiz_completed`, `analysis_result`, `report_requested`, `email_submitted` and `$pageview` `/r/:id`, each once among the named events. No property of any captured request holds the id, every event shares one `distinct_id`, and no `$identify` was sent;
  3. a second case declines consent once and sees `consent_answered` `{ agreed: false }`;
  4. a third answers analyze with 500 and sees one `analysis_failed`;
  5. a fourth goes Back during analyzing (route held open) and sees none.

  Flags and remote-config requests get an empty 200; polls wait up to 20 s. Done when the spec fails against the current code.

  Result 2026-10-09: the report id is the 22-character `e2eFunnelReport0000000`, so `/r/<id>` is a real report path (design decision 4's `/r/e2e-report` is 10 characters and would never meet the mask). `posthog-js` drops every event from a likely bot, so the spec sets a phone user agent and clears `navigator.webdriver` and `userAgentData`; that also keeps every other spec's PostHog requests from being sent at all. Capture bodies are gzip without a `compression` parameter, so the decoder detects gzip by its magic bytes. Case 5 holds the analyze route open and anchors on the landing's later `$pageview` instead of a second send; with the `left` guard removed it fails. Case 2 also covers "Back to a step already seen" (`report_requested` twice, `analysis_result` once).

## 3. Code

- [x] 3.1 Create `apps/web/src/lib/analytics/index.ts` with `track` (moved) and `maskReportIds` (design decision 2, with a `ponytail:` note on encoded ids). Re-export `track` from `lib/capture/events.ts`. Pass `before_send: maskReportIds` in `initPostHog`. Done when 2.1 passes and `capture.test.ts` and `observability.test.ts` pass unedited.
- [x] 3.2 `flow.tsx`: `consent_answered`, `quiz_completed`, `analysis_failed` (only when `!left`) and `report_requested`, as in design decision 3. Done when the flow steps of 2.5 pass locally (`pnpm test:e2e e2e/funnel.spec.ts`).
- [x] 3.3 `_email/step.tsx`: `email_submitted` on `open`, before `router.push`. Done when 2.5's `email_submitted` step passes.
- [x] 3.4 `lib/report/actions.tsx`: `share_tapped` with a `place` prop (`header` for the header button), `share_card_downloaded` on each Download, and `palette_saved` with its method from the `download` closure. `share.ts` stays unchanged. Done when 2.2 and `share.test.ts` pass.
- [x] 3.5 `lib/interest/premium-card.tsx`: `premium_tapped` on `clicked`. Done when 2.3 and `premium-card.test.tsx` pass.
- [x] 3.6 BL-11 and the E2E keys (design decision 4):
  - `playwright.config.ts` gets one `E2E_ENV` (the current values, plus `NEXT_PUBLIC_POSTHOG_KEY: "phc_e2e"` and `NEXT_PUBLIC_POSTHOG_HOST: "http://127.0.0.1:9"`);
  - the prebuilt command becomes `pnpm build && pnpm start`, with a web-server timeout that covers the build;
  - `.github/workflows/e2e.yml` drops `pnpm build`, and its header comment says why.

  Done when a local `pnpm build` followed by `CI=1 pnpm test:e2e` passes, and `.next` is then rebuilt with the test key: `grep -r phc_e2e apps/web/.next/static` finds it, and the production DSN is not in the bundle.

  Result 2026-10-09: before, the local build's bundle held the production DSN host (1 file); after `CI=1 pnpm test:e2e` it holds `phc_e2e` (1 file) and no DSN. 51 of 52 pass; the one failure is the known macOS-only `/seasons/Soft-Autumn` 200 (case-insensitive disk, see `t5-report-delivery` 4.1), which passes on Linux CI.

## 4. Gate

- [x] 4.1 `pnpm fix`, then `pnpm test` (unit and E2E). Done when both pass and CI (`ci.yml`, `openspec.yml`, `e2e.yml`) is green on the pushed branch; record the counts here.

  Result 2026-10-09: `pnpm fix` clean; 589 unit tests pass; E2E on the built server (`CI=1`) 53 of 54, the one failure the known macOS-only `/seasons/Soft-Autumn` case; under `pnpm dev` the one failure is BL-12. CI green on `01ba304` (CI, E2E, OpenSpec); the PR's checks gate the merge.

## 5. Checks with the user

- [x] 5.1 On the preview deployment, with the user's yes (no model call, but it writes `is_test` rows to the production Supabase and sends one email through Resend), from the user's phone:
  1. run a quiz-only analysis: two failed photos, then "Continue without a photo";
  2. "Get my full report", the user's address, then on the report: Share, Save and Premium.

  Then, through the PostHog connector, filtered to the preview's `$host`:
  - check the expected events and counts:
    - `$pageview` `/analyze`;
    - `photo_checked` twice, and no `consent_answered`;
    - `quiz_completed` and `report_requested`, each with `quiz_only: true`;
    - `analysis_result`, `email_submitted` and `$pageview` `/r/:id`;
    - `share_tapped`, `palette_saved` and `premium_tapped`, each with its expected properties;
  - check with SQL that no property of any event since the run holds `/r/` followed by 22 id characters, or the address;
  - scan the events since 2026-10-09 the same way: `/r/` pages were live and unmasked on preview and production from then. Show the user any hit whose id still resolves to a report, and ask what to do;
  - check that no `$identify` was sent.

  Delete the test report, its address and its interest row. Done when a Tracker Log line records the results.

  Result 2026-10-09, preview `seasonly-6ez2nfzu6` (commit `96c31f2`), from the user's phone: `$pageview /analyze`; `photo_checked` ×2 (`no-face`), no `consent_answered`; `quiz_completed` and `report_requested` with `quiz_only: true`; `analysis_result` (`result`), `email_submitted`, `$pageview /r/:id`; `share_tapped` `{ place: actions, outcome: shared }`; the first "Save my palette" closed the sheet and sent nothing, the second sent `palette_saved` `{ method: share-sheet }`; `premium_tapped`. All 41 events share one `distinct_id`; none holds a report-id path, the report's id or the address; no `$identify`, `$set` or alias in the project. Scan since 2026-10-09: two ids were stored unmasked (`V-kYLkoM…` on preview and production, `3VWeBndh…` from localhost), and neither resolves to a report any more, so nothing to do. Test report `GTs_p3qI…` deleted, its address and interest row with it (cascade). Tracker Log line added at archive.

- [x] 5.2 Through the PostHog connector, without stopping for approval (user, 2026-10-09):
  - create the action "Shared or saved";
  - create the funnel insight "Landing to share" (design decision 6);
  - add it to the Seasonly dashboard (id 989985).

  Done when the insight's link is recorded here and in the Tracker Log, and its query runs. Its steps fill once this change reaches production.

  Result 2026-10-09: action "Shared or saved" (id 166067: `share_tapped` with `outcome` `shared`, `share_card_downloaded`, `palette_saved`); funnel insight [Landing to share](https://eu.posthog.com/project/290879/insights/u9u1pu2U) (`u9u1pu2U`, tile 7289338 on dashboard 989985), Landing as a `$pageview` whose `$pathname` does not match `^/(analyze$|r/)`. Its query runs: 32 landings and 1 flow start on `seasonly.me` in the last 30 days, later steps 0 until this change ships. Tracker Log line added at archive.

## 6. Backlog and archive prep

- [x] 6.1 Before archive:
  - log in `docs/backlog.md` every phase-review finding left unfixed, and every defect found on the way, under the next `BL-nn` ids;
  - add report ids in Sentry's request URLs (design Non-Goals) if the review agrees it is worth fixing;
  - delete BL-09 and BL-11;
  - name every added and deleted id in the PR.

  Done when `_Next id:_` is correct.

  Result 2026-10-09: phase review (fresh subagent, `/code-review high`) found 8 issues, all fixed: the flags request leaked the first page's `/r/<id>` (flags off, E2E case for a report as first page, carried to `t7-paywall-off`); the mask now covers `/api/face/` and `/api/reports/`; `SENTRY_AUTH_TOKEN` blanked in `E2E_ENV`; a real 45 s timeout case (Playwright clock); refused and failed addresses send no `email_submitted`; the first case waits for a later landing view before its exact list and checks `$prev_pageview_pathname`; the build log is piped in CI; the referrer scenario now names the previous page path. Report ids in Sentry are carried to `t8-photo-privacy` as one decision, not logged. Backlog: added BL-12 (dev-mode cache-control E2E failure); deleted BL-09 (`draping.dom.test.tsx`) and BL-11 (`E2E_ENV` at build).

- [x] 6.2 At archive:
  - add the README row `analytics`: `apps/web/src/lib/analytics/**`;
  - re-add the analytics spec's Public Interface (`track`, `maskReportIds`), Behavior (the event table's call sites, the mask's reach, the E2E host) and Edge Cases;
  - in capture-flow's Public Interface, note that `track` lives in `lib/analytics` and is re-exported;
  - in the plan's carried list, for `t8-photo-privacy`: decide on cookie consent for PostHog (a banner, or cookieless mode with "Cookieless server hash mode" turned on), and name PostHog and what it receives on the privacy page;
  - in the plan's carried list, for `t8-photo-privacy`: decide whether Sentry receives report ids (they are sent on purpose as `extra.reportId` in `report/read.ts`, `email/send.ts`, `email/store.ts`, `interest/record.ts`, and in request URLs); if yes, say so on the privacy page, if no, mask `/r/`, `/api/face/` and `/api/reports/` in Sentry's `beforeSend` and `beforeBreadcrumb` and drop those extras (phase review);
  - in the plan's carried list, for `t7-paywall-off`: PostHog flags are off (`advanced_disable_flags`) because the flags request sends the first page's URL, a report id for a visitor from the email link, outside `before_send`. Turn them on only with that URL masked (rewrite the stored initial person info, or a proxy), and keep `funnel.spec.ts`'s "report is the first page" case green;
  - in the Tracker, mark T5 Done.

  Done when `openspec validate --specs` and the README mapping test pass.

## Workflow follow-up

- After `/opsx:apply`: phase review in a fresh `general-purpose` subagent, fix its findings, log what stays unfixed (6.1), `/opsx:archive`, push, open a PR to `main` naming the BL ids added and deleted, and turn on auto-merge with a merge commit.
