## Why

Seasonly uploads a face crop, but nothing deletes it. `/privacy` and `/terms` say "Coming soon", and the consent screen, the report footer and the report email already promise "deleted within 24 hours". The launch gate (T11, Oct 26) needs three things: privacy and terms pages that are live, the photo deletion job running, and a legal check. Eight carried items from finished changes are waiting on this change: AI provider retention, consent copy, test-row cleanup, model downloads, crops, stored addresses, PostHog and Sentry. The concept says face photos are sensitive and that some laws treat face data as biometric.

## What Changes

- **Design and copy gate first.** The MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) has no legal-page board, and its consent copy (05) says nothing about the AI provider. tasks.md opens with a canvas prompt for the user to approve. The user also fills in the operator's name, country and contact address, and the minimum age, before any page text is written.
- **Deletion job (`data-retention`).** A daily Vercel Cron calls `GET /api/cron/retention` on `seasonly.me` with `CRON_SECRET`. The job does two things:
  - it deletes every crop in the `crops` bucket that is older than 24 h;
  - it deletes every `is_test` report older than 24 h, which also removes its addresses and interest row.

  Each run selects by age, so a missed run is caught up by the next one. A new migration gives the server's role `delete` on `reports` and `report_emails`.

- **Deletion is daily, not hourly (the user's choice, 2026-10-09).** Vercel Hobby runs a cron job at most once a day, ±59 min. The pages keep the "within 24 hours" wording, but in the worst case a crop is stored for about 49 h. This is a known gap the user accepted for the beta. It is logged in `docs/backlog.md` and closes on a move to Vercel Pro or an hourly scheduler.
- **Retention on request (the user's choice, 2026-10-09).** Reports, addresses and interest rows are kept until the person asks for deletion. A request goes to the contact address and is answered within 30 days, using a documented procedure. No self-serve deletion is built.
- **Privacy page.** `/privacy` lists:
  - everything that is stored, and for how long: the crop, the report record, up to 3 addresses per report, and the interest record;
  - that the report link is the only key to a report, so anyone holding the link can open the report, can fetch the crop while it is kept, and can see the address in the Premium note;
  - every service that receives data, and what each one gets:
    - Vercel: hosting, BotID and Speed Insights;
    - Supabase: in the EU;
    - Google, through Vercel AI Gateway: the face crop. Google does not train on it, but without zero data retention it may keep it for a limited time for abuse monitoring;
    - Resend: email delivery;
    - PostHog (EU): anonymous funnel events with report ids masked, and a first-party cookie set with no banner (the user's choice, 2026-10-09);
    - Sentry (Germany): errors, which can carry report ids (the user's choice, 2026-10-09);
    - jsDelivr and Google Cloud Storage: the browser downloads the face-detection files from them;
  - that face landmarks are found on the device and are never used to identify anyone;
  - how to ask for access or deletion.
- **Terms page.** `/terms` says what the service is (an estimate for style, not professional advice), the minimum age, that a person may upload only their own photo, no warranty, limitation of liability, changes to the terms, contact, and governing law.
- **Both pages are marked ready**, so they are indexed and listed in the sitemap. The site-structure stub-page example moves from `/terms` to `/how-it-works`.
- **Consent copy.** The consent screen adds who reads the crop: an AI model from Google, through Vercel, that does not train on it.
- **Legal check (user gate).** The user has the final privacy and terms text reviewed, or explicitly waives a review for the beta, and the date is recorded. Text the agent drafts is not legal advice.
- **Folded in from `docs/backlog.md`:** BL-10. The draping preview shows "Your photo has been deleted" for every failure to load the face, including a storage error inside the 24 h window. It becomes one line that is true in both cases.

## Capabilities

### New Capabilities

- `data-retention`: the daily deletion job (old crops, old test reports), its schedule and secret, and how a deletion request is handled.
- `legal-pages`: what the privacy policy and the terms of use must say, and that they are live and indexed.

### Modified Capabilities

- `capture-flow`: the consent step also says which AI provider reads the crop, and that the provider does not train on it.
- `report-page`: when the face cannot be loaded, the draping line no longer claims the photo was deleted (BL-10).
- `site-structure`: the stub-page scenario uses `/how-it-works`, since `/terms` ships.

## Impact

- **Code**
  - `apps/web/src/app/api/cron/retention/route.ts` and `apps/web/src/lib/retention/`: the job.
  - `apps/web/vercel.json` (new): the cron schedule.
  - `apps/web/src/app/(site)/privacy/page.tsx` and `apps/web/src/app/(site)/terms/page.tsx`: the content.
  - `apps/web/src/lib/site/routes.ts`: `/privacy` and `/terms` set to `ready: true`.
  - `apps/web/src/app/(flow)/analyze/_capture/steps.tsx`: the consent copy.
  - `apps/web/src/lib/report/draping.tsx`: the face-failure line.
- **Database:** one migration, `<ts>_retention.sql`, which grants `delete` on `reports` and `report_emails` to `service_role`. It is applied to the Supabase project `seasonly` after the user confirms.
- **Env:** `CRON_SECRET` (phase 1, required, server only) is added to the code, `.env.example`, the env catalogue and `verify-env`, and set in Vercel Production. Vercel sends it as the cron request's bearer token.
- **Existing tests:**
  - `apps/web/src/lib/site/routes.test.ts` and `e2e/site-structure.spec.ts` assert that `/terms` is a stub, so they move to `/how-it-works`. This edit needs the user's approval.
  - The draping tests change with the BL-10 copy.
- **Dependencies:** none.
- **Accounts (user):**
  - `CRON_SECRET` in Vercel;
  - a contact mailbox (for example `privacy@seasonly.me` forwarded at Porkbun);
  - the legal review or waiver.
- **Not changed:** PostHog stays as it is (cookie, no banner). Sentry keeps report ids. Gateway ZDR stays off. All three are disclosed on `/privacy`, not built.
- **Downstream**
  - `t9-site-content`: `/how-it-works` becomes the stub example until it ships, and t9 then moves the example to another stub or retires the scenario.
  - The permanent specs `draping-preview`, `email-capture`, `interest-button` and `analytics` have Edge Case notes pointing at `t8-photo-privacy`. These are rewritten at archive.
