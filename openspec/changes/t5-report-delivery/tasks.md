## 1. Design (user gate)

- [x] 1.1 The user pastes this prompt into Claude Design, on the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3):

  ```text
  Using the "Seasonly" design system, add these states to the MVP canvas. Reuse the existing
  boards' layout and components; anything missing goes into the design system first.

  1. "08f Season reveal · report not saved", next to 08: the reveal when the result could not be
     saved. Keep the family, tagline and reveal line. Replace "Get my full report" with a Note
     "We couldn't save your report" / "Your season is below, but your full report needs one more
     try." and a primary "Try again". Keep "Retake my photo".
  2. Email step (09), three extra frames:
     - invalid address: the EmailInput error "Enter an email like you@example.com";
     - sending: "Send my report" disabled while the request runs;
     - failed: a danger Note "We couldn't send your report. Nothing is lost, so you can try
       again." under the field, the typed address kept, the button enabled again.
     Also a quiz-only variant: "What's inside" without "Your best and worst color, side by side".
  3. Full report (10 · 375 and 10 · 1280):
     - a quiz-only variant: no draping section, sections numbered "of 5", footer without a photo
       line;
     - the draping preview after the photo is gone: both color frames with the empty face slot
       and the line "Your photo has been deleted, so this shows the two colors only.";
     - footer: "Your photo is deleted within 24 hours of your analysis." (present tense, not
       "was deleted on <date>"), then "This report stays at seasonly.me/r/k7m2qx.";
     - Premium card, failed tap: the button back to "Premium report – coming soon" and the line
       "We couldn't save that. Please try again.";
     - the share panel for browsers that cannot share files: both share cards (story 9:16 and
       post 1:1) as images, each with a "Download" button, closable; at 375 and 1280.
  4. "10c Report could not load": the report's header, "We couldn't open your report", "Your
     report is safe. Reload the page in a moment." and a primary "Reload".
  5. Report email (12): footer "Your photo is deleted within 24 hours of your analysis. We keep
     only your result." (present tense).
  ```

  Done when the user approves the new and changed artboards in chat. Record the date here and in `mvp-design-canvas` memory, and give the new boards' names in design.md decision 8 (share panel). Any copy the user changes on the canvas is updated in the delta specs before 3.x cites it.

  Approved 2026-10-09 (canvas version 30, edited in place rather than through Claude Design). The share panel's added line "Download a card, then post it from your photos." went into the report-page delta. On board 09b the failed Note splits its copy: title "We couldn't send your report", body "Nothing is lost, so you can try again." 08f puts its Note above the season, since its copy says "Your season is below". The deleted-photo face slot keeps the DS "Face" placeholder label.

## 2. Plan, accounts and test-edit approval

- [x] 2.1 Update the plan for `t5-report-delivery` on branch `claude/t5-report-delivery-proposal-ojaeru`:
  - add a "t5-report-delivery planned" Log line to the Tracker (newest first), naming the user's choices of 2026-10-08 (email required; only Premium tappers get one later email; the address shown in the Premium note; Try again on a null report id);
  - remove both `t5-report-delivery` items from "Carried in from finished changes" (Architecture and phases tab).

  T5 stays In progress until `t5-report-delivery` and `t5-funnel-analytics` archive. Done when the Log shows the line and the carried list holds no `t5-report-delivery` item.

- [x] 2.2 Ask the user to approve these edits to existing tests (CLAUDE.md gate), each of which the change would otherwise break or needs:
  - `apps/web/src/lib/site/seo.test.ts`: the import `@/app/(flow)/r/[id]/page` becomes `@/app/(report)/r/[id]/page` (design.md decision 1);
  - `apps/web/src/app/(flow)/analyze/flow-state.test.ts`: new cases for the email step (entered from the reveal, Back returns to the reveal) and for "Try again" on a reveal with a null report id;
  - `apps/web/src/components/ds/ds.test.tsx`: EmailInput in the class-coverage fragment (with hint and with error), and the ui-components scenario "A disabled button with a destination";
  - any test that asserts `BOTID_PROTECT`'s exact value, if one exists;
  - `store.test.ts` and `crops.test.ts` only if the BL-01 refactor (5.1) breaks them; asked then, not now.

  Done when the user approves in chat; record the date here.

  Approved 2026-10-09 (all three). No test asserts `BOTID_PROTECT`'s exact value (`api/analyze/route.test.ts` uses `toContainEqual`).

- [x] 2.3 The user, in Resend: adds and verifies the domain `seasonly.me` (SPF and DKIM records at the domain's DNS), and creates an API key with sending access only. The key goes into Vercel (Production and Preview) and `apps/web/.env.local` as `RESEND_API_KEY`. Done when Resend shows the domain as verified; record the date here.

  Verified 2026-10-09 (user).

## 3. Tests first

Existing tests change only as approved in 2.2. New tests go in new files and cite their scenario at its permanent path.

- [x] 3.1 `apps/web/src/lib/observability/with-timeout.test.ts`: success gives `{ ok: true, value }`; a rejection and a 3 s hang (fake timers, the signal aborted) each capture one Sentry error carrying `extra` and its cause, flush, and give `{ ok: false }`. Done when it fails for the missing module.
- [x] 3.2 Migrations in PGlite, on a stub `reports` table, in `apps/web/src/lib/email/store.test.ts` and `apps/web/src/lib/interest/record.test.ts`:
  - `store_report_email` answers `stored` three times, then `limit`, and `unknown` for a missing report;
  - its body locks the report row (`for update`), since PGlite has one connection and cannot race two calls;
  - the anonymous role is refused select and insert on both tables, and execute on the function;
  - interest: a second insert for the same report is a no-op, and the demand-gate count leaves out `is_test` rows and counts one report once;
  - deleting a report deletes its addresses and interest.

  Done when it fails for the missing migrations.

- [x] 3.3 `email-capture`, new files under `apps/web/src/lib/email/` and `apps/web/src/app/api/reports/[id]/email/`:
  - the address schema: trims and lowercases; refuses empty, `maya.reyes@gmail`, and 255 characters;
  - `renderReportEmail` for Soft Autumn (photo): the subject, preview text, "You're a Soft Autumn: warm, soft and earthy.", the badge, the 4 highlights in order with hex codes, both links to `https://seasonly.me/r/<id>`, the photo footer line, and the plain-text part with the link; for quiz-only: "your quiz answers" and no photo line;
  - `sendReportEmail`: the request to Resend (from, to, subject, html, text, `Idempotency-Key`); a 500 and a 5 s hang each reach Sentry without the address; no key off Vercel sends nothing and reports nothing; no key with `VERCEL_ENV` set reports to Sentry;
  - the route, with BotID, the store and the sender injected or mocked: a bot gets 403 and nothing is read; `short` gets 404 with no store call; a malformed address gets 400; `unknown` gets 404; `limit` gets 429 with no send; `stored` gets 200 and schedules one send to the lowercased address; a store failure gets 500, and Sentry's report has no address.

  Done when the new cases fail for the missing modules.

- [ ] 3.4 `report-page`, new files under `apps/web/src/lib/report/`:
  - `ReportView` rendered from injected records:
    - Soft Autumn photo: the season block, then the six section overlines and titles in order, 24 then 6 colors, Soft Coral first and Espresso last, every swatch with name and hex, the draping frames on `/api/face/<id>` with the draping line, and the footer's three lines;
    - all 12 seasons: palette plus neutrals are 30 distinct colors;
    - `personal` shows the stored summary and note body under the static note title; `capped` shows the static copy;
    - quiz-only: five sections "of 5", no draping, no `/api/face/` URL, no photo footer line;
  - `ReportDraping`: an image `error` switches to the empty face slot and the deleted-photo line;
  - `readReport`: a row gives the record, the latest address and the interest flag; no row gives null; an error and a 3 s hang reach Sentry and throw;
  - the page: `short` calls `notFound()` without `readReport`; an unknown id calls `notFound()`;
  - share and save as pure helpers: `canShare` true shares the story with the spec's text; false opens the panel; `AbortError` leaves the state idle; save downloads `seasonly-soft-autumn-palette.png` and then reads "Saved", disabled.

  Done when they fail for the missing modules.

- [ ] 3.5 `interest-button`, new files under `apps/web/src/lib/interest/` and `apps/web/src/app/api/reports/[id]/interest/`:
  - the route: `short` gets 404 with no database call; an unknown id (a `23503` error) gets 404; the first and a repeated tap get 200; a store failure gets 500 and reaches Sentry;
  - `PremiumCard`: idle; clicked with `maya.reyes@gmail.com`; clicked with no address ("We'll email you once"); a failed tap back to idle with the error line; opened with recorded interest shows the clicked state.

  Done when they fail for the missing modules.

- [ ] 3.6 Flow and reveal:
  - make the edits approved in 2.2 to `flow-state.test.ts`;
  - in a new `apps/web/src/app/(flow)/analyze/_reveal/reveal.test.tsx`: a result with an id shows "Get my full report"; a null id shows "We couldn't save your report" and "Try again", and no "Get my full report";
  - in a new `apps/web/src/app/(flow)/analyze/_email/email-step.test.tsx`: the photo and quiz-only lists; an invalid address shows the error and sends no request; 200 and 429 both push `/r/<id>`; a 500 shows the danger Note with the address kept; the button is disabled while sending.

  Done when the new cases fail.

- [x] 3.7 UI components:
  - make the edits approved in 2.2 to `ds.test.tsx`;
  - add `apps/web/src/components/ds/email-input.test.tsx` for the ui-components delta scenarios (label, hint, error with `aria-invalid` and "Error:").

  Done when they fail for the missing component and the Button fix.

- [x] 3.8 Abuse controls, in a new `apps/web/src/lib/abuse/botid.test.ts`: `BOTID_PROTECT` holds `POST /api/analyze` and the email route's path. The route's bot case is in 3.3. Done when it fails.
- [ ] 3.9 BL-03 and E2E:
  - a Vitest case in a new `apps/web/src/lib/share-card/share-card-golden.test.ts` compares Soft Autumn's rendered story card with `e2e/fixtures/share-soft-autumn-story.png`;
  - a new `e2e/report-delivery.spec.ts` covers design.md decision 10's two cases, plus a fetch of `/images/share/soft-autumn/story` compared with the same golden.

  First render the card twice in Vitest and once under `next start` to confirm the bytes are stable (design.md decision 9), and note the result here. Done when the E2E fails only for the missing UI.

## 4. Env

- [x] 4.1 Add `RESEND_API_KEY` (phase 1, required, server only, "Resend → API Keys, sending access") to the code that reads it, `apps/web/.env.example`, the catalogue in `openspec/specs/env/spec.md` and `scripts/verify-env.ts` (shape `re_…`). Done when the env unit tests pass and `pnpm verify:env 1` reports it `ok` with the key from 2.3 in `.env.local`.

## 5. Implementation

- [x] 5.1 Write `withTimeout` (design.md decision 4) and move `saveReport` and `storeCrop` onto it. Done when 3.1 passes and `store.test.ts` and `crops.test.ts` pass unchanged; if either needs an edit, stop and ask the user. Delete BL-01 from `docs/backlog.md`.
- [x] 5.2 Write `supabase/migrations/<ts>_report_emails.sql` and `<ts>_interest_clicks.sql` (design.md decision 2). Do not apply them. Done when 3.2 passes.
- [x] 5.3 Check that `botid` matches `/api/reports/*/email` with a throwaway: `initBotId` with that pattern, then a request to a concrete path under `next dev`, looking for the challenge header. Record the result here. If it does not match, switch to the fixed path of design.md decision 6, and update decision 1's table and the email-capture and abuse-controls deltas before going on. Done when the result is recorded.

  Result 2026-10-09: it matches. `botid` 1.5.11's client turns a protected path into an anchored regex with `*` as `.*` (`dist/client/core/index.mjs`). Run on that very function, `/api/reports/*/email` matches `/api/reports/<22-char id>/email` and does not match `/api/reports/<id>/interest`, `/api/analyze` or `/api/reports/email`. The matcher was checked by itself, not under `next dev`, because BotID attaches no challenge off Vercel. 6.3 step 6 checks the header on the preview. Decision 6's path stands.

- [x] 5.4 Write `apps/web/src/lib/email/` (`address.ts`, `render.ts`, `send.ts`, `store.ts`), the email route with `withErrorCapture`, BotID and `after()`, and add the path to `BOTID_PROTECT`. Done when 3.3 and 3.8 pass.
- [x] 5.5 Add EmailInput to `apps/web/src/components/ds/` with its `.sn-field*` rules in `ds.css` (from `bundle.css`, with token variables), export it, and make a disabled Button with `href` render without one. Done when 3.7 passes and the class-coverage test passes. Delete BL-05 from `docs/backlog.md`.
- [ ] 5.6 Flow: the `email` step and `open-email` in `flow-state.ts`; "Get my full report" and the null-id Note with "Try again" in `_reveal/steps.tsx`; `_email/step.tsx` wired in `flow.tsx`. Done when 3.6 passes and the existing E2E still passes.
- [ ] 5.7 Report:
  - move `apps/web/src/app/(flow)/r/[id]/page.tsx` to `apps/web/src/app/(report)/r/[id]/`, with `(report)/layout.tsx`, `not-found.tsx` and `error.tsx` from board 10c;
  - write `lib/report/` (`read.ts`, `view.tsx` and the client islands, design.md decisions 3, 7 and 8).

  Done when 3.4 and the approved `seo.test.ts` pass, and the site-structure route-map test still passes.

- [ ] 5.8 Interest: `lib/interest/` and the interest route with `withErrorCapture`, and `PremiumCard` placed in the report view. Done when 3.5 passes.
- [ ] 5.9 Commit the golden PNG and make 3.9 pass. Delete BL-03 from `docs/backlog.md`, or, if decision 9's fallback failed, rewrite BL-03 with what was found.
- [ ] 5.10 Run `pnpm fix`, `pnpm test` and `pnpm --filter web build`. Done when all pass, and the build output lists `/r/[id]` as dynamic and both `/api/reports/[id]/…` routes.

## 6. Checks with the user

- [ ] 6.1 Ask the user to confirm applying both migrations to the Supabase project `seasonly` (ref `qisseuermrrwvvnfyjet`) through the connector, as `crops_bucket` was on 2026-10-07. Rename the local files to the applied versions. Done when the connector lists both migrations, and a select as `anon` on each table is refused.
- [ ] 6.2 Run the app locally against the project with `.env.local`. Create one quiz-only report through the flow: free, no model call, and an `is_test` row. Show the user, in a scratch Artifact:
  - screenshots of that report at 375 and 1280;
  - the same report with a photo record's draping, with the crop present and missing (pointing at the Soft Autumn crop from 6.3, once it exists, or at a placeholder JPEG);
  - the rendered report email.

  Done when the user confirms they match the boards approved in 1.1; record the date here.

- [ ] 6.3 On the preview deployment, with the user's yes for one paid analysis, from the user's iPhone:
  1. run a photo analysis, choose "Get my full report" and send the user's own address;
  2. check that the report opens at once, and that the email arrives with the right season, 4 highlights and a working link, in Gmail and Apple Mail;
  3. check that the draping preview shows the face, that "Share my season" opens the share sheet with the story card, and that "Save my palette" saves the palette image;
  4. tap Premium, check the note shows the address, and check the `interest_clicks` row is `is_test`;
  5. send the address three more times, and check that the fourth is answered 429 and opens the report without an email;
  6. check `curl -I` on the report shows `private` and `no-store`, and that the email request carries BotID's challenge;
  7. on a throwaway commit, make `readReport` throw for one fixed id, open it, check the 500 page and the Sentry event, record whether `onRequestError` also fired, then revert the commit.

  Delete the test report (its address, interest and crop go with it or by hand). Done when a Tracker Log line records the results.

## 7. Backlog and archive prep

- [ ] 7.1 Before archive, log in `docs/backlog.md` every phase-review finding not fixed and every defect found on the way that is worth fixing later, under the next free `BL-nn` ids, and name them in the PR. Check that BL-01, BL-03 and BL-05 are gone or rewritten as 5.1, 5.5 and 5.9 say, and that BL-04 still stands (no DOM ShareCard preview ships). Done when the file's `_Next id:_` line is correct.
- [ ] 7.2 At archive:
  - add the README rows:
    - `email-capture`: `apps/web/src/app/(flow)/analyze/_email/**`, `apps/web/src/app/api/reports/[id]/email/**`, `apps/web/src/lib/email/**`, `supabase/migrations/*_report_emails.sql`;
    - `report-page`: `apps/web/src/app/(report)/**`, `apps/web/src/lib/report/**`;
    - `interest-button`: `apps/web/src/app/api/reports/[id]/interest/**`, `apps/web/src/lib/interest/**`, `supabase/migrations/*_interest_clicks.sql`;
  - re-add each new spec's Public Interface, Behavior and Edge Cases;
  - add EmailInput to the ui-components Public Interface;
  - in site-structure's Behavior, `/r/[id]` lives in `(report)`;
  - in observability's Purpose, the page-render gap is closed for `/r/[id]`, with 6.3's finding about `onRequestError`;
  - in the plan's carried list:
    - `t5-funnel-analytics`: the email-submitted, share, save and interest events from this change's buttons;
    - `t8-photo-privacy`: disclose the stored address and interest record and how to have them deleted;
    - `t7-paywall-off`: the paywall replaces the email step and unlocks the report page.

  Done when `openspec validate --specs` and the README mapping test pass.

## Workflow follow-up

- After `/opsx:apply`: phase review in a fresh `general-purpose` subagent, fix its findings, log what stays unfixed (7.1), `/opsx:archive`, push, open a PR to `main` naming the BL ids added and deleted, and turn on auto-merge with a merge commit.
- Mark T5 Done in the Tracker only once `t5-funnel-analytics` also archives.
