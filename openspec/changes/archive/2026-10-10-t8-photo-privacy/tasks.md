## 1. Design, copy and operator details (user gate)

- [x] 1.1 The user pastes this prompt into Claude Design, on the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3), or the agent edits the canvas in place with the user's yes:

  ```text
  Using the "Seasonly" design system, add or change these boards. Reuse the existing boards'
  layout and components; anything missing goes into the design system first.

  1. "<next free number> Legal page" in row 4 (Site pages; check first whether T14 already has a privacy or terms board, and change that one instead), 375 and 1280: the site header and footer, the
     overline "Legal", the h1, a "Last updated <date>" caption, then long-form sections: an h2
     per section, body paragraphs, a bullet list and a two-column "service / what it gets"
     list. Fill it with the privacy policy's section headings: What we store and for how long;
     Your report link; Who else receives data; What we never do; Your rights; Contact.
  2. 05 Consent: under "Why", add who reads the crop: "An AI model from Google, through
     Vercel, reads the colors. It does not train on your photo." Keep the rest of 05.
  3. 10d Draping · photo deleted: change the line to "We couldn't load your photo, so this
     shows the two colors only." (it shows for any failure, not only a deletion).
  ```

  Done when the user approves the new and changed boards in chat. Record the date here and in the `mvp-design-canvas` memory. If the user changes any copy on the canvas, update the `capture-flow` and `report-page` deltas before 3.x cites it.

  Approved 2026-10-10 (canvas version 33, edited in place by the agent, no design-system change):
  - Board 20 already existed as the T14 legal template, so it was changed: "20 Legal page · /privacy and /terms", 375 and a new 1280 (`Legal-1280.dc.html`). Board 21 and the T14 note moved right. The service list is a plain `<dl>`, two columns, hairline rows.
  - The board's body text is a draft from this proposal. Operator, country, contact, date and rights under the governing law are placeholders until 1.2; the "send us your report link" line in Your rights is unconfirmed and settles with `docs/privacy-requests.md` (5.5). Final page text comes from 1.3.
  - 05 Consent and 10d carry the copy above word for word; the `capture-flow` and `report-page` deltas already match. 10d is renamed "10d Draping preview · photo could not load".

- [x] 1.2 Ask the user for the facts the pages need. The agent invents none of them:
  - the operator's name as shown, and their country;
  - the governing law;
  - the contact address. The suggestion is `privacy@seasonly.me`, forwarded with Porkbun's free email forwarding, which the user sets up;
  - the minimum age. The suggestion is 16, the GDPR default for consent without a parent.

  Done when all four are recorded here.

  Recorded 2026-10-10, from the user:
  - operator: "Seasonly", run by an individual (no legal entity yet), in Bulgaria;
  - governing law: Bulgaria (EU, so the GDPR applies; the authority is Bulgaria's Commission for Personal Data Protection);
  - contact: `care@seasonly.me` (changed from `privacy@` by the user on 2026-10-10; it will also be on the contact page);
  - minimum age: 16.

- [x] 1.3 Draft both pages' full text in a scratch Artifact, from the inventory:
  - the migrations;
  - `lib/report-text/index.ts` (what the vision call sends);
  - `lib/capture/mediapipe.ts`;
  - the user's choices of 2026-10-09 (daily deletion with the 24 h wording, the PostHog cookie with no banner, Sentry keeps report ids, data kept until a request);
  - the facts from 1.2.

  The processor list comes from a recorded network capture. Previews sit behind Vercel SSO, so run it in the user's signed-in Chrome (Claude in Chrome), on the latest preview, never on production, where a quiz-only run would write a real row counted by the demand gate. Run a quiz-only flow, the email step and a report page, list every request host, and compare them with the `legal-pages` list. A photo analysis needs the user's yes, because it is a paid call; without one, the vision host comes from the code. Delete the test report afterwards. Record the hosts here.

  Each service's own retention (Vercel request logs, AI Gateway logging and Google's abuse-monitoring window, Resend's sent-email logs, PostHog's event retention, Sentry's event retention) is looked up in that service's current docs or account settings, never from memory, and recorded here with its source. Also check in Resend whether click or open tracking is on for `seasonly.me`. If click tracking is on, every report link passes through Resend's link domain. Turn it off with the user's yes, or name it on the page.

  Network capture, 2026-10-10, preview `seasonly-4oecvdgd1-aligators-projects.vercel.app` (commit c3234c7) in the user's Chrome: one photo analysis (paid, approved), the email step and the report page. Hosts:
  - the deployment itself: pages, `/api/analyze`, `/api/reports/<id>/email`, `/api/face/<id>`, the share and palette images, BotID (`/149e9513…/a-4-a`, `/.well-known/vercel/jwe`) and Speed Insights (`/e93758f6c792abd7/script.js`);
  - `cdn.jsdelivr.net` (MediaPipe wasm) and `storage.googleapis.com` (`mediapipe-models`: face landmarker, hair segmenter);
  - `odml.pa.googleapis.com/v1/log`: MediaPipe's own usage log (task type, running mode, timings; no image), sent from every page that runs face detection. It has no opt-out in the 1.0.1 API. Missing from the original `legal-pages` list, so the delta now names it;
  - `eu.i.posthog.com` (`/e/`), with the first-party `ph_phc_…_posthog` cookie;
  - `o4508841814130688.ingest.de.sentry.io` (Sentry, Germany);
  - `vercel.live`: the preview feedback toolbar only, not served on production;
  - server side (from the code, not visible to the browser): Vercel AI Gateway to Google (`lib/report-text/index.ts`), Supabase, Resend.
  - Report email (Gmail, test inbox): every link goes through `l.seasonly.me/CL0/…` and the email carries an `l.seasonly.me/CI0/…` pixel, so Resend click **and** open tracking are on for `seasonly.me`. The agent cannot sign in to Resend, and the API key is sending-only.
  - Test report `__gd1JDZrt_xFk2k1vca4A` (`is_test`, photo, one address, crop stored) is kept for the by-link check in 6.3, which deletes it.

  Retention of each service, looked up 2026-10-10:
  - Vercel runtime logs: 1 hour on Hobby ([Runtime Logs, Limits](https://vercel.com/docs/logs/runtime)).
  - Vercel AI Gateway: keeps no prompts or outputs, "immediately and permanently deleted after requests are completed"; without ZDR, routing ignores provider retention ([AI Gateway ZDR](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr)). The model is served by `google` or `vertex`.
  - Google: Gemini API paid services log prompts and responses "for a limited period of time" for abuse monitoring and never train on them ([Gemini API terms](https://ai.google.dev/gemini-api/terms)); Vertex AI keeps abuse-monitoring logs "for up to 90 days" ([Vertex AI abuse monitoring](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/abuse-monitoring)). The page says up to 90 days.
  - Resend: email data, logs and metrics 30 days on Free, Pro and Scale ([account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)).
  - PostHog: events 7 years on paid plans; the org is pay-as-you-go ([events retention](https://posthog.com/docs/data/events-retention)).
  - Sentry: errors 30 days on Developer, 90 on Team ([data retention periods](https://docs.sentry.io/security-legal-pii/security/data-retention-periods/)). Plan of org `blockdev` to confirm.
  - Supabase: no automatic backups on the Free plan, so a deleted row is gone ([backups](https://supabase.com/docs/guides/platform/backups)).
  - jsDelivr: IP addresses aggregated "often within hours, and then deleted" ([jsDelivr blog](https://jsdelivr.com/blog/how-the-german-courts-ruling-on-google-fonts-affects-jsdelivr-and-why-it-is-safe-to-use)).
  - Google Cloud Storage and the MediaPipe log: no published period; Google's privacy policy applies.

  Done when the user approves the text in chat; record the date here.

  **Approved 2026-10-10** (draft doc https://claude.ai/artifact/Hio6CA23jzRxKPr9q83uLH), with the user's answers: contact `care@seasonly.me`; Resend click and open tracking stay on and are named in the Resend row; Sentry org `blockdev` is on the free Developer plan, so 30 days holds; Google's "up to 90 days" and the MediaPipe log row stand.

- [x] 1.4 Legal check: the user has the approved text reviewed by someone qualified, or waives a review for the beta in writing in chat. Record which, who and the date here. The text the agent drafts is not legal advice. It does not block the code tasks, but archive, the PR and auto-merge all wait for it (7.2).

  **Recorded 2026-10-10:** the user reviewed and approved the text themselves ("I'll review", then "I approve"). No outside qualified reviewer; for the beta this stands in place of one.

## 2. Plan and test-edit approval

- [x] 2.1 Update the plan for `t8-photo-privacy` on branch `t8-photo-privacy`:
  - Add a "t8-photo-privacy planned" line at the top of the Tracker Log (newest first). Name the user's choices of 2026-10-09: daily Vercel Cron with the 24 h wording kept for the beta (worst case about 49 h); the PostHog cookie with no banner; Sentry keeps report ids, disclosed; data kept until a request. Set T8 to In progress.
  - In the "Architecture and phases" tab:
    - in the Phase 1 table, rename the capabilities `consent, photo-retention` to `data-retention, legal-pages`, and the exit check to "Crops deleted daily after 24 h; privacy and terms live";
    - in the stack table, change "Vercel Cron deletes photos older than 24 h" to "Vercel Cron, daily, deletes crops older than 24 h (Hobby: once a day)";
    - remove the `t8-photo-privacy` items from "Carried in from finished changes".

  Done when the Log shows the line and the carried list holds no `t8-photo-privacy` item.

- [x] 2.2 Ask the user to approve these edits to existing tests (CLAUDE.md gate):
  - `apps/web/src/lib/site/routes.test.ts`: the "stub page" case moves from `/terms` to `/how-it-works`;
  - `e2e/site-structure.spec.ts`: "a stub page carries noindex" moves from `/terms` to `/how-it-works`;
  - `apps/web/src/lib/report/draping.dom.test.tsx` and `apps/web/src/lib/report/view.test.tsx` (lines 210–214): "Your photo has been deleted, so this shows the two colors only." becomes the new BL-10 line, and the `not.toContain("has been deleted")` check stays.

  No existing test asserts the consent step's body copy (`e2e/analysis-flow.spec.ts` checks only the "Before we upload" heading), so the provider line needs no edit.

  Done when the user approves in chat; record the date here. **Approved 2026-10-10.**

## 3. Tests first

Existing tests change only as approved in 2.2. New tests go in new files and cite their scenario at its permanent path.

- [x] 3.1 `data-retention`, in a new `apps/web/src/lib/retention/retention.test.ts`, with storage and time injected:
  - a crop 25 h old is removed and one 23 h old is kept;
  - 250 old crops among young ones are all removed across pages of 100;
  - one 47 h old (after a missed run) is removed;
  - a `remove` that deletes fewer than asked throws instead of looping;
  - a listing error throws.

  Done when it fails for the missing module.

- [x] 3.2 The migration, in PGlite, in the same file or a new `apps/web/src/lib/retention/reports.test.ts`:
  - with the existing reports, report_emails and interest_clicks migrations applied, deleting old `is_test` reports removes the 25 h old test report with its two addresses and its interest row;
  - it keeps a year-old real report and a test report from an hour ago, and returns a count of 1;
  - `service_role` holds `delete` on `reports` and `anon` does not.

  Done when it fails for the missing migration.

- [x] 3.3 The route, in a new `apps/web/src/app/api/cron/retention/route.test.ts`, with the job injected or mocked:
  - no header, a wrong token and an unset `CRON_SECRET` with `Bearer undefined` each answer 401 and call nothing;
  - the right token answers 200 `{ crops: 3, testReports: 1 }`;
  - a listing error answers 500 and reaches Sentry (`withErrorCapture`).

  Done when it fails for the missing route.

- [x] 3.4 `legal-pages`, in a new `apps/web/src/app/(site)/legal-pages.test.tsx`, rendering both pages to static markup:
  - privacy names the crop with "24 hours", the report record, the addresses, the interest record, the report-link sentence, each service in the spec's list, the 30-day answer, the contact address and "Last updated";
  - terms states the estimate, the minimum age, own photos only, no warranty, governing law and contact, and links to `/privacy`;
  - neither holds "Coming soon";
  - `pageMetadata` for both has no `robots`, and `indexedUrls()` holds both.

  Done when it fails on the stubs.

- [x] 3.5 Make the edits approved in 2.2. Add the consent-provider scenario in a new `apps/web/src/app/(flow)/analyze/_capture/consent.test.tsx` (it renders `Consent` and finds the Google line and the `/privacy` link), and the draping 500 scenario (`The face request fails`) to the draping DOM test. Done when the new and edited cases fail for the old copy, and the `/how-it-works` stub cases pass.

## 4. Env

- [x] 4.1 Add `CRON_SECRET` (phase 1, required, server only, "Any random string, 32+ chars; Vercel sends it as the cron's bearer token") to:
  - the route;
  - `apps/web/.env.example`;
  - the catalogue in `openspec/specs/env/spec.md`;
  - `scripts/verify-env.ts`.

  The user puts one generated value in `apps/web/.env.local` and in Vercel Production and Preview (Preview is used by 6.4). `verify:env` runs in no CI job and no build, so a missing value cannot break a deploy; the route refuses every request instead. Done when `pnpm verify:env 1` reports it `ok` locally. **`ok` on 2026-10-10; the user set it in Vercel Production and Preview the same day.**

## 5. Implementation

- [x] 5.1 Write `supabase/migrations/<ts>_retention.sql` (design.md decision 5). Do not apply it. Done when 3.2 passes.
- [x] 5.2 Write `apps/web/src/lib/retention/` (decisions 4 and 5) and `apps/web/src/app/api/cron/retention/route.ts` (decision 3), wrapped in `withErrorCapture`, with the job's results as JSON. Add `apps/web/vercel.json` with the daily `0 4 * * *` cron. Done when 3.1 and 3.3 pass and `BOTID_PROTECT` is unchanged.
- [x] 5.3 Write `/privacy` and `/terms` from the text approved in 1.3 and the layout of the legal-page board from 1.1 (decision 7), and set both routes `ready: true` in `lib/site/routes.ts`. Done when 3.4 passes and the site-structure tests pass.
- [x] 5.4 Consent copy in `_capture/steps.tsx`, and the BL-10 line in `lib/report/draping.tsx` (decision 8), both from the approved boards. Done when 3.5 passes. Delete BL-10 from `docs/backlog.md`.
- [x] 5.5 Write `docs/privacy-requests.md` (decision 6). Rewrite the Edge Case notes that point at `t8-photo-privacy` in the permanent specs:
  - `draping-preview`: "Nothing deletes crops yet";
  - `email-capture`: "Addresses are kept until…";
  - `interest-button`: the address shown to link holders, now disclosed;
  - `analytics`: the PostHog cookie and Sentry report ids, now disclosed on `/privacy`;
  - `report-page`: the BL-10 note and the footer note.

  Each now states the shipped behavior. Done when no permanent spec mentions `t8-photo-privacy` as future work (`grep -rn t8-photo-privacy openspec/specs`).

- [x] 5.6 Run `pnpm fix`, `pnpm test` and `pnpm --filter web build`. Done when all pass, the build lists `ƒ /api/cron/retention`, and `/privacy` and `/terms` are static.

  2026-10-10, local: `pnpm fix` clean; unit 664/664; the build lists `ƒ /api/cron/retention` and `○ /privacy`, `○ /terms`. E2E with `CI=1` (prebuilt, as CI runs it): 53/54. The one failure, `/seasons/Soft-Autumn` answering 200, is macOS only: its case-insensitive disk serves the prerendered `soft-autumn` page. Without `CI=1` (dev server), the report-500 case also fails, on `no-cache, must-revalidate` instead of `private, no-store`. Neither touches this change (BL-21). CI on Linux, commit cddaa67: CI, E2E and OpenSpec all pass.

## 6. Checks with the user

- [x] 6.1 Ask the user to confirm applying `<ts>_retention.sql` to the Supabase project `seasonly` (ref `qisseuermrrwvvnfyjet`) through the connector. Rename the local file to the applied version. Done when, as `service_role`, a delete on a throwaway `is_test` report succeeds and removes its address row; record the date here.

  **2026-10-10:** applied with the user's yes as version `20261010084236` (local file renamed). Before it, `service_role` already held delete on `reports` through Supabase's default privileges (as the phase review found), so the migration states the grant rather than adding it. As `service_role`, deleting throwaway `is_test` report `t8throwawayAAAAAAAAAAA` succeeded and removed its address row.

- [x] 6.2 Run the app locally against the project with `.env.local`. Show the user `/privacy`, `/terms`, the consent step and the draping-failure state at 375 and 1280, in a scratch Artifact. Done when the user confirms they match the approved boards and text; record the date here.

  **Confirmed 2026-10-10** on https://claude.ai/artifact/FdP1fiVY81WQR9ERqLuCmb (local dev against the project; consent shown at 375 only, since the flow is a phone screen at every width).

- [x] 6.3 Try the deletion-request procedure in `docs/privacy-requests.md` on one quiz-only `is_test` report with an address:
  - by link: the report, its address and its interest row are gone, and `/r/<id>` answers 404;
  - by address, on a second test report: the address is gone and the report remains.

  Done when both results are recorded here.

  **2026-10-10, with the user's yes:**
  - by link, on photo report `__gd1JDZrt_xFk2k1vca4A` from the 1.3 capture (with one address, an interest row added for the check, and its crop): the crop removed through the Storage API, the report deleted in SQL; report, address, interest row and crop all gone, and `https://seasonly.me/r/<id>` and `/api/face/<id>` answer 404;
  - by address, on `is_test` report `t8byaddressAAAAAAAAAAA`: the request written ` T8-ByAddress@Example.com` matched through `lower(trim(…))`; the address is gone and the report remained (then removed as test clean-up).

- [x] 6.4 Prove the job on the preview deployment before merge. The user runs `curl -H "Authorization: Bearer $CRON_SECRET" https://<preview>/api/cron/retention` with the Vercel bypass for SSO, or approves the agent running it. Check that:
  - it answers 200 with its counts;
  - no crop older than 24 h remains (list the `crops` bucket through the connector);
  - `select count(*) from reports where is_test and created_at < now() - interval '24 hours'` is 0;
  - the same request without the header answers 401.

  Previews share the production Supabase project, so this run is the real first cleanup. Done when the results are recorded here.

  **2026-10-10, with the user's yes**, on preview `seasonly-ftl86fyck-aligators-projects.vercel.app` (commit cddaa67), through a Vercel share link for SSO. Production held no old crop or test report, so the agent seeded one `is_test` report 25 h old (two addresses, an interest row), one 1 h old, and two crops, one backdated to 25 h:
  - no header: 401; a wrong token: 401;
  - the right token: 200 `{"crops":1,"testReports":1}`;
  - after the run: no crop older than 24 h, `select count(*) from reports where is_test and created_at < now() - interval '24 hours'` is 0, the old report's addresses and interest row are gone, and the fresh crop and fresh report remained (then removed as test clean-up).

## 7. Backlog and archive prep

- [x] 7.1 Before archive, log in `docs/backlog.md`, under the next free `BL-nn` ids, and name them in the PR:
  - every phase-review finding not fixed, and every defect found on the way that is worth fixing later;
  - deferred, "until Vercel Pro or before paid promotion (T15)": deletion runs daily, so a crop can stay about 49 h while the pages say 24 h. The fix is an hourly scheduler calling the same route;
  - deferred, "before paid promotion or a complaint": the PostHog cookie is set without consent. The fix is `cookieless_mode` or a banner with `on_reject`.

  Check that BL-10 was deleted in 5.4.

- [x] 7.2 Archive, push, PR and auto-merge wait until 1.4 is recorded. At archive:
  - add the `data-retention` and `legal-pages` rows to `openspec/specs/README.md` (design.md decision 1);
  - re-add Public Interface, Behavior and Edge Cases to both new permanent specs;
  - add a Tracker Log line, and leave T8 In progress until the production checks below.

  After merge (the follow-up recorded in the Tracker, not a task here):
  - production lists the cron `/api/cron/retention` at `0 4 * * *` (Vercel → Cron Jobs);
  - the first scheduled run's log shows 200;
  - `https://seasonly.me/privacy` and `/terms` carry no `noindex` and are in the sitemap.

  T8 is set Done once these three are recorded in a Log line.
