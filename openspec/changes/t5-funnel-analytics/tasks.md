## 1. Setup

- [ ] 1.1 Add `jsdom` as a root dev dependency (`pnpm add -Dw jsdom`). Done when a throwaway `// @vitest-environment jsdom` test sees `document` and `pnpm test:unit` still runs every other file in Node. Delete the throwaway test.

## 2. Tests first

Cite scenarios at `openspec/specs/analytics/spec.md#…`. Add new files or new cases; edit no existing assertion without the user's approval.

- [ ] 2.1 `apps/web/src/lib/analytics/analytics.test.ts` (Node):
  - `maskReportIds` rewrites `/r/<22 id chars>` to `/r/:id`:
    - in `$current_url`, `$pathname`, `$referrer`, a nested `$elements[].$el_text`, `$elements_chain` and `$set_once.$initial_current_url`;
    - in every occurrence within one string.
  - It leaves alone `/r/` followed by 21 or 23 id characters, and strings with no id.
  - Its pattern accepts exactly what `REPORT_ID` accepts, on generated ids.
  - `initPostHog` with a key passes `before_send: maskReportIds` (mocked `posthog-js`).
  - No file under `apps/web/src` calls `identify`, `setPersonProperties`, `alias` or `register` on PostHog, or passes `$set`.

  Done when the file fails against the current code, because `lib/analytics` does not exist.

- [ ] 2.2 `apps/web/src/lib/report/actions.dom.test.tsx` (jsdom), with `posthog-js` mocked as loaded:
  - "Share my season" with a share sheet that resolves sends one `share_tapped` `{ place: "actions", outcome: "shared" }`;
  - the header "Share" with one that rejects with `AbortError` sends `{ place: "header", outcome: "cancelled" }`;
  - with no `canShare`, the tap sends `outcome: "panel"`, and the panel's post Download sends `share_card_downloaded` `{ ratio: "post" }`;
  - "Save my palette" sends `palette_saved` with `method: "share-sheet"` through the sheet and `"download"` without it, and nothing when the sheet is cancelled.

  No property holds the report id. Done when it fails for the missing events.

- [ ] 2.3 `apps/web/src/lib/interest/premium-card.dom.test.tsx` (jsdom). A tap whose route answers 200 sends one `premium_tapped`, and a 500 sends none. Done when it fails for the missing event.
- [ ] 2.4 BL-09: `apps/web/src/lib/report/draping.dom.test.tsx` (jsdom). Firing `error` on the face image of `ReportDraping` shows the deleted-photo fallback. Cite `openspec/specs/report-page/spec.md`'s draping-fallback scenario. Done when it passes against the current code, since the behavior already ships.
- [ ] 2.5 `e2e/funnel.spec.ts` on a phone viewport, with `http://127.0.0.1:9/**` routed and each capture body decoded (JSON, or gzip on `compression=gzip-js`):
  1. `/` → header "Find my colors" → upload the fixture face → "Agree and upload" → 4 answers → "See my result" (analyze route answered with a result and `reportId: "e2e-report"`) → "Get my full report" → a valid address (email route answered 200);
  2. poll until the received events, in order, are `$pageview` `/`, `$pageview` `/analyze`, `photo_checked`, `consent_answered` (`agreed: true`), `quiz_completed`, `analysis_result`, `report_requested`, `email_submitted` and `$pageview` `/r/e2e-report`, each once among the named events;
  3. a second case declines consent once and sees `consent_answered` `{ agreed: false }`;
  4. a third answers analyze with 500 and sees one `analysis_failed`;
  5. a fourth goes Back during analyzing (route held open) and sees none.

  `e2e-report` is not a 22-character id, so the mask needs its own case. Open `/r/AAAAAAAAAAAAAAAAAAAAAA`: the read fails without a database, so the error page is shown. Check that its `$pageview` URL ends in `/r/:id`. Done when the spec fails against the current code.

## 3. Code

- [ ] 3.1 Create `apps/web/src/lib/analytics/index.ts` with `track` (moved) and `maskReportIds` (design decision 2, with a `ponytail:` note on encoded ids). Re-export `track` from `lib/capture/events.ts`. Pass `before_send: maskReportIds` in `initPostHog`. Done when 2.1 passes and `capture.test.ts` and `observability.test.ts` pass unedited.
- [ ] 3.2 `flow.tsx`: `consent_answered`, `quiz_completed`, `analysis_failed` (only when `!left`) and `report_requested`, as in design decision 3. Done when the flow steps of 2.5 pass locally (`pnpm test:e2e e2e/funnel.spec.ts`).
- [ ] 3.3 `_email/step.tsx`: `email_submitted` on `open`, before `router.push`. Done when 2.5's `email_submitted` step passes.
- [ ] 3.4 `lib/report/actions.tsx`: `share_tapped` with a `place` prop (`header` for the header button), `share_card_downloaded` on each Download, and `palette_saved` with its method from the `download` closure. `share.ts` stays unchanged. Done when 2.2 and `share.test.ts` pass.
- [ ] 3.5 `lib/interest/premium-card.tsx`: `premium_tapped` on `clicked`. Done when 2.3 and `premium-card.test.tsx` pass.
- [ ] 3.6 BL-11 and the E2E keys (design decision 4):
  - `playwright.config.ts` gets one `E2E_ENV` (the current values, plus `NEXT_PUBLIC_POSTHOG_KEY: "phc_e2e"` and `NEXT_PUBLIC_POSTHOG_HOST: "http://127.0.0.1:9"`);
  - the prebuilt command becomes `pnpm build && pnpm start`, with a web-server timeout that covers the build;
  - `.github/workflows/e2e.yml` drops `pnpm build`, and its header comment says why.

  Done when a local `pnpm build` followed by `CI=1 pnpm test:e2e` passes, and `.next` is then rebuilt with the test key: `grep -r phc_e2e apps/web/.next/static` finds it, and the production DSN is not in the bundle.

## 4. Gate

- [ ] 4.1 `pnpm fix`, then `pnpm test` (unit and E2E). Done when both pass and CI (`ci.yml`, `openspec.yml`, `e2e.yml`) is green on the pushed branch; record the counts here.

## 5. Checks with the user

- [ ] 5.1 On the preview deployment, with the user's yes (no model call, but it writes `is_test` rows to the production Supabase and sends one email through Resend), from the user's phone:
  1. run a quiz-only analysis: two failed photos, then "Continue without a photo";
  2. "Get my full report", the user's address, then on the report: Share, Save and Premium.

  Then, through the PostHog connector, filtered to the preview's `$host`:
  - check that each event of the spec's table arrived once, with the expected properties;
  - check with SQL that no property of any event since the run holds `/r/` followed by 22 id characters, or the address;
  - check that no `$identify` was sent.

  Delete the test report, its address and its interest row. Done when a Tracker Log line records the results.

- [ ] 5.2 With the user's yes, through the PostHog connector:
  - create the action "Shared or saved";
  - create the funnel insight "Landing to share" (design decision 6);
  - add it to the Seasonly dashboard (id 989985).

  Done when the insight's link is recorded here and in the Tracker Log, and its query runs. Its steps fill once this change reaches production.

## 6. Backlog and archive prep

- [ ] 6.1 Before archive:
  - log in `docs/backlog.md` every phase-review finding left unfixed, and every defect found on the way, under the next `BL-nn` ids;
  - add report ids in Sentry's request URLs (design Non-Goals) if the review agrees it is worth fixing;
  - delete BL-09 and BL-11;
  - name every added and deleted id in the PR.

  Done when `_Next id:_` is correct.

- [ ] 6.2 At archive:
  - add the README row `analytics`: `apps/web/src/lib/analytics/**`;
  - re-add the analytics spec's Public Interface (`track`, `maskReportIds`), Behavior (the event table's call sites, the mask's reach, the E2E host) and Edge Cases;
  - in capture-flow's Public Interface, note that `track` lives in `lib/analytics` and is re-exported;
  - in the plan's carried list, for `t8-photo-privacy`: decide on cookie consent for PostHog (a banner, or cookieless mode with "Cookieless server hash mode" turned on), and name PostHog and what it receives on the privacy page;
  - in the Tracker, mark T5 Done.

  Done when `openspec validate --specs` and the README mapping test pass.

## Workflow follow-up

- After `/opsx:apply`: phase review in a fresh `general-purpose` subagent, fix its findings, log what stays unfixed (6.1), `/opsx:archive`, push, open a PR to `main` naming the BL ids added and deleted, and turn on auto-merge with a merge commit.
