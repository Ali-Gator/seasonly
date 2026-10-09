## Why

The reveal names only the season family, and nothing yet delivers the product itself: `/r/<id>` answers 404 for every id, no email is collected, and the share card, palette PNG and draping preview built by `t5-report-images` are on no page. The concept's stage 1 (the full report free for an email, plus a "Premium report – coming soon" button that records interest) is what the demand gate measures, and it is the last Phase 1 change before `t7-paywall-off`. Phase 1 table: `t5-report-delivery` creates `email-capture`, `report-page` and `interest-button`, with the exit check "Email arrives with a working report link; interest click recorded".

## What Changes

- **Design gate first.** The MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) has the reveal's "Get my full report" (08), the email step (09), the full report at 375 and 1280 (10), the Premium states (10) and the report email (12). It lacks the states this change adds; tasks.md opens with a Claude Design prompt for them, and the user approves before any UI code:
  - the reveal with no report id;
  - the email step's invalid-address and failed-send states, and its quiz-only list;
  - the report's quiz-only form (no draping), the draping preview after the crop is gone, a failed Premium tap and the share panel for browsers that cannot share files;
  - present-tense photo lines in the report footer and the email footer (the canvas says "was deleted", which is not yet true when they are read).
- **Reveal.** "Get my full report" opens the email step. A result with no report id (the save failed) shows "We couldn't save your report" and "Try again", which re-sends the same analysis.
- **Email step (canvas 09).** Inside `/analyze`. The address is required: there is no way to the report without it (user's choice, 2026-10-08). "Send my report" stores the address under the report, answers at once and opens `/r/<id>`. The email is sent after the response, so a slow or failed send never holds the report back.
- **Report email (canvas 12).** From `Seasonly <report@seasonly.me>` through Resend: the season, its tagline, a season badge, the season's first 4 highlights with names and hex codes, "Open my report" to `https://seasonly.me/r/<id>`, the link in plain text, and a plain-text part.
- **Report page `/r/<id>` (canvas 10).** Rendered on request from the stored record, never indexed and never cached by a shared cache:
  - the season, its summary and traits, and the agreement note, with the personal text in place of the static copy when the record has it;
  - six sections: palette (24), colors to avoid, best neutrals (6, so 30 colors in all), metals, makeup and hair, and the draping preview with `/api/face/<id>`;
  - a quiz-only report has no draping section; a crop that no longer loads shows the two colors without the face;
  - "Share my season" (the share cards) and "Save my palette" (the palette PNG): the phone's share sheet where it accepts files, a download elsewhere;
  - the 1280 layout from 1024 px wide;
  - an unknown id answers 404; a failed read answers an error page and reaches Sentry, which closes the observability gap on page render errors.
- **Interest button.** "Premium report – coming soon" records one interest per report and shows "We'll let you know" with "We'll email <address> once, when they are." The address is shown as the canvas has it (user's choice, 2026-10-08). Only people who tapped it get that one later email (user's choice, 2026-10-08); there is no newsletter and no opt-in box.
- **Abuse.** BotID guards the email route; a report gets at most 3 emails, so one analysis cannot spam an inbox.
- **Folded in from `docs/backlog.md`:**
  - BL-01: one timeout-and-report helper for every Supabase call, now that this change adds four.
  - BL-03: a check that the built share card uses the real fonts, since this change ships the cards to people.
  - BL-05: a disabled Button with a destination no longer navigates; the report's "Saved" and "We'll let you know" states depend on it.

## Capabilities

### New Capabilities

- `email-capture`: the email step, storing the address under its report, the report email and its delivery.
- `report-page`: the personal report at `/r/<id>`: its content, the draping preview, sharing and saving, and how it fails.
- `interest-button`: the Premium button, the one interest record per report and its clicked state.

### Modified Capabilities

- `season-reveal`: the reveal offers "Get my full report"; a result with no report id offers to try again.
- `ui-components`: adds EmailInput; a disabled button with a destination renders no link (BL-05).
- `abuse-controls`: BotID on the report email route; at most 3 emails per report.
- `site-structure`: "The public routes are fixed" gains the scenario of a stored report answering 200 with `noindex`.

## Impact

- **Code**
  - `apps/web/src/app/(flow)/analyze/`: the email step (`_email/`), the reveal's new actions, and the flow state.
  - `apps/web/src/app/(report)/r/[id]/`: the report page moves from `(flow)` to its own route group, since boards 10 and 10·1280 have their own header; the URL is unchanged.
  - `apps/web/src/lib/report/`: reading a report, and the report's view pieces.
  - `apps/web/src/app/api/reports/[id]/email/route.ts` and `apps/web/src/lib/email/`: storing, rendering and sending.
  - `apps/web/src/app/api/reports/[id]/interest/route.ts` and `apps/web/src/lib/interest/`.
  - `apps/web/src/lib/abuse/botid.ts`: the email route joins the protected paths.
  - `apps/web/src/components/ds/`: EmailInput, and the Button fix.
  - `apps/web/src/lib/supabase.ts`: the shared timeout-and-report helper (BL-01), used by `saveReport`, `storeCrop` and the new calls.
- **Database:** two migrations, applied to the Supabase project `seasonly` after the user confirms:
  - `<ts>_report_emails.sql`: `report_emails` and a function that stores an address only while its report has fewer than 3;
  - `<ts>_interest_clicks.sql`: `interest_clicks`, one row per report.

  Both have RLS on with no policies, like `reports`.

- **Dependencies:** none. The email is sent with `fetch` to Resend's API and rendered with `react-dom/server`.
- **Env:** `RESEND_API_KEY` (phase 1, required, server only) joins the code, `.env.example`, the env catalogue and `verify-env`.
- **Accounts (user):** the domain `seasonly.me` verified in Resend (DNS records), and the key in Vercel and `.env.local`.
- **Downstream**
  - `t5-funnel-analytics`: the email-submitted, share, save and interest events fire from this change's buttons; this change sends no PostHog event.
  - `t8-photo-privacy`: the privacy page names the stored address and the interest record, how long they are kept, and how to have them deleted; the photo lines in the report and email footers become true once crops are deleted.
  - `t7-paywall-off`: the paywall replaces the email step; the report page is what it unlocks.
  - Later: the one launch email to people who tapped Premium.
