## Context

- **Reports.** `POST /api/analyze` stores one `public.reports` row per result under a 22-character base64url id (`saveReport`, `apps/web/src/lib/analysis/store.ts`) and answers `reportId` (null when the save failed). `REPORT_ID` (`apps/web/src/lib/draping/crops.ts`) is the id's regex. The table has RLS on, no policies, and `select, insert` granted to `service_role` only. `apps/web/src/lib/supabase.ts` is the server's lazy client with the secret key.
- **Copy and colors.** `@seasonly/analysis` already holds every word and color the report shows: `PALETTES[slug]` (best 24, avoid, neutrals 6, metals, metalsAvoid, lips, blush, eyes, hair, draping, highlights 6), `SEASON_COPY[slug]` (tagline, summary, undertone, chroma, contrast, the section intros, hairTip, drapingLine) and `AGREEMENT_COPY[agreement]`. `seasonName(slug)` is in `apps/web/src/lib/site/routes.ts`, as is `ORIGIN = "https://seasonly.me"`.
- **Images.** `t5-report-images` built `/images/share/<slug>/story|post` (with `shareCardAlt`), `/images/palette/<slug>`, `/api/face/<id>` (404 when there is no crop) and DrapingPair.
- **Flow.** `apps/web/src/app/(flow)/analyze/flow.tsx` is one client component driven by the pure reducer in `flow-state.ts`. Each new step pushes a history entry, and the outcome of analyzing replaces it. The reveal is `_reveal/steps.tsx`. `(flow)/layout.tsx` wraps every flow page in the phone column with a wordmark-only header, and `/r/[id]` lives there today as a stub that always calls `notFound()`.
- **Guards.** BotID protects `/api/analyze` (`BOTID_PROTECT` in `apps/web/src/lib/abuse/botid.ts`, used by `instrumentation-client.ts`). Every route handler must use `withErrorCapture`. `saveReport` and `storeCrop` each copy the same 3 s timeout, Sentry capture and flush (BL-01).
- **Design inputs.** MVP canvas https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3: boards 08 Reveal, 09 Email step, "10 Full report · 375", "10 Full report · 1280", "10 Premium button", 11 Share cards, 11b Palette image and 12 Report email, plus the states added and approved on 2026-10-09 (task 1.1): 08f Season reveal · report not saved, 09b Email step · invalid, sending, failed, quiz only, 10b Full report · quiz only (375 and 1280), 10c Report could not load, 10d Draping preview · photo deleted, 10e Share panel (375 and 1280), and the Premium board's failed tap; the design-system bundle (`project/ds/seasonly/components/bundle.js|css`) holds EmailInput and SeasonBadge.

Motivation: proposal.md. Requirements: the delta specs under `specs/`.

## Goals / Non-Goals

**Goals:**

- The report opens the moment the address is stored. Nothing on its path waits for the email provider.
- One stored record drives the page and the email: no report text is written after the analysis.
- No new runtime dependency.
- Every new database call has the same timeout and Sentry behavior, from one helper.

**Non-Goals:**

- PostHog events for email, share, save and interest (`t5-funnel-analytics`).
- The paywall, and the teaser that replaces the email step (`t7-paywall-off`).
- Deleting addresses, interest records or crops, and the privacy page's words about them (`t8-photo-privacy`).
- The launch email to people who tapped Premium; this change only keeps what it needs.
- `/sample-report`. It can later reuse the report view with Soft Autumn's static copy, but its content is T9's.
- A DOM ShareCard preview. The share panel shows the PNGs themselves, so BL-04 stays open.

## Decisions

### 1. Routes and where the code lives

| Path                              | File                                                  | Capability        |
| --------------------------------- | ----------------------------------------------------- | ----------------- |
| email step (inside `/analyze`)    | `apps/web/src/app/(flow)/analyze/_email/`             | `email-capture`   |
| `POST /api/reports/<id>/email`    | `apps/web/src/app/api/reports/[id]/email/route.ts`    | `email-capture`   |
| store, render, send               | `apps/web/src/lib/email/`                             | `email-capture`   |
| `/r/<id>`                         | `apps/web/src/app/(report)/r/[id]/`                   | `report-page`     |
| read, view, share and save        | `apps/web/src/lib/report/`                            | `report-page`     |
| `POST /api/reports/<id>/interest` | `apps/web/src/app/api/reports/[id]/interest/route.ts` | `interest-button` |
| record, Premium card              | `apps/web/src/lib/interest/`                          | `interest-button` |

The report moves from `(flow)` to a new `(report)` route group. Boards "10 Full report · 375" and "· 1280" have their own header (the wordmark with Share on a phone, the wordmark with the report's address on a desktop) and a wide page from 1024 px. The flow layout's wordmark-only phone column fits neither. The URL does not change. `(report)/layout.tsx` carries no header. `(report)/r/[id]/not-found.tsx` renders the same "report not found" page as `(flow)/not-found.tsx` does today, and `error.tsx` renders the failed-read page.

`lib/email/address.ts` (the address schema) has no server imports, so the email step and the route share one check. `lib/email/send.ts` and `lib/email/store.ts` are server only.

Alternatives considered:

- Keep `/r/[id]` in `(flow)` and drop the header Share. That departs from both approved boards to save one layout file.
- `/api/report-email` with the id in the body. A path per report makes BotID's protected path and the 404 for an unknown id read the same way as `/api/face/<id>`.

### 2. Data model: two tables, one claim function

`<ts>_report_emails.sql`:

```sql
create table public.report_emails (
  id bigint generated always as identity primary key,
  report_id text not null references public.reports(id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  created_at timestamptz not null default now(),
  is_test boolean not null
);
create index on public.report_emails (report_id, created_at desc);
-- ('stored', row id, season, agreement) | ('limit', null, season, agreement) | ('unknown', nulls);
-- locks the report row so two calls cannot both pass 3. The row id is the email's idempotency key.
create function public.store_report_email(p_report_id text, p_email text, p_is_test boolean)
  returns table (outcome text, email_id bigint, season text, agreement text)
  language plpgsql security definer set search_path = ''
  as $$ … select … from public.reports rp where rp.id = p_report_id for update; … $$;
```

`<ts>_interest_clicks.sql`:

```sql
create table public.interest_clicks (
  report_id text primary key references public.reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  is_test boolean not null
);
```

Both tables, and the function, follow the `reports` migration: RLS on with no policies, everything revoked from `public, anon, authenticated`, and only `service_role` granted (`select, insert` on the tables, `execute` on the function). `on delete cascade` lets `t8-photo-privacy` delete a report, and its address and interest go with it. `is_test` follows `saveReport`'s rule, `VERCEL_ENV !== "production"`.

Interest is an `upsert` with `ignoreDuplicates`, so a repeat tap is a success that writes nothing. An unknown id is a foreign-key violation (`23503`), mapped to 404. The id is checked against `REPORT_ID` before either route touches the database.

The demand-gate count is `select count(*) from interest_clicks i join reports r on r.id = i.report_id where not i.is_test and not r.is_test` against `select count(*) from reports where not is_test`. The join matters: a report made on a preview can be opened, and its Premium button tapped, on production, since the email always links there (phase review).

Alternatives considered:

- An `email` column on `reports`. A person may correct a typo, and the 3-address limit needs a count. A column would also widen the grant on `reports` to `update`.
- Counting in the route, then inserting. Two requests at once would both pass the limit. The function makes count and insert one step, as the daily-cap claim does.

### 3. Reading a report: one query, its own Sentry report

`readReport(id)` in `lib/report/read.ts` gives the record, the latest address and whether interest exists, from one PostgREST select that embeds both child tables (`reports?select=*,report_emails(email,created_at),interest_clicks(report_id)`, ordered and limited on the embed). It gives `null` for no row. For an error or a 3 s timeout, it reports to Sentry, flushes and then throws, so the `error.tsx` boundary answers 500.

The page itself captures. That is how the observability gap closes: the `observability` Purpose notes that `onRequestError` did not fire for route handlers in a Vercel production build. The preview check (task 8.3) also records whether it fires for this page; the result goes into that Purpose at archive.

The page is dynamic (`export const dynamic = "force-dynamic"`). Next sends `private, no-cache, no-store` for dynamic pages, and a test asserts it on the built server.

The address reaches the page only for the Premium note (the user chose to show it, 2026-10-08). It is passed to the Premium card only once interest exists, so a report nobody has tapped holds no address in its HTML. The first tap gets the address from the interest route instead: it answers `{ ok: true, email }` with the latest address, read after the insert (found in task 5.8). This shows nothing beyond what the clicked note shows.

### 4. One timeout-and-report helper (BL-01)

`withTimeout(label, run, { ms = 3000, extra })` in `apps/web/src/lib/observability/with-timeout.ts`, next to `withErrorCapture`:

- gives `run` an `AbortSignal` that fires at `ms`;
- races `run` against the same timeout;
- on failure or timeout, captures `new Error(label, { cause })` with `extra` (a report id, never an address), flushes for 2 s, and answers `{ ok: false }`;
- on success, answers `{ ok: true, value }`.

`saveReport`, `storeCrop`, the email store, the interest record and `readReport` all use it. `readReport` throws on `{ ok: false }`; the others map it to their own failure. Their existing tests must pass unchanged. If one needs an edit, it goes to the user first (task 2.2).

### 5. The email: React to static HTML, `fetch` to Resend

`renderReportEmail({ id, season, quizOnly })` gives `{ subject, html, text }`. The HTML is built from template strings with every inserted string escaped. `react-dom/server` was the plan, but route handlers resolve React's `react-server` build, and there `react-dom/server` throws (found in task 5.4):

- table layout and inline styles, because mail clients ignore classes and most CSS;
- colors from `tokens.json`, as `lib/og` does;
- font stacks with Georgia and the system sans as fallbacks, because mail clients do not load web fonts;
- the preview text as a hidden first line;
- the season badge drawn inline (season and "<Family> family"). No page shows a SeasonBadge, so it is not added to `components/ds`;
- the 4 highlights as a 4-column table of chips with name and hex.

The plain-text part is built from the same strings.

`sendReportEmail(to, email, { emailId, reportId })` POSTs to `https://api.resend.com/emails` with `RESEND_API_KEY`, through `withTimeout(…, { ms: 5000 })`:

- the `Idempotency-Key` header is `report-email/<row id>`, so a retried request never sends twice;
- a non-2xx answer becomes an error carrying the status and Resend's error `name` only, never its `message`, which can echo the address;
- with no key, it returns at once, reporting to Sentry only when `VERCEL_ENV` is set.

The route calls it inside `after()`, once the row is stored, and answers `{ ok: true }` first. `store_report_email` gives the report's season and agreement with the row id, so the route renders the email without a second read. `maxDuration` is 30 s: 1 s BotID, a 3 s store and 2 s flush before the answer, then a 5 s send and 2 s flush after it.

Alternatives considered:

- The `resend` SDK or React Email. Each adds a dependency for one `fetch` and one template. React Email's components would also replace a table layout we can test as plain markup.
- `react-dom/server` in a route handler. It throws under the `react-server` export condition that route handlers resolve.
- Sending before answering. That makes the report wait up to 5 s on the provider.

### 6. The email step in the flow

The reducer gains:

- the step `email` (holding `reportId` and `quizOnly`), entered from the reveal by `open-email`, which pushes a history entry, so Back returns to the reveal;
- the reveal's "Try again" for a null `reportId`, which dispatches the existing `try-again` path, so the same request is re-sent.

`_email/step.tsx`:

- checks the address with the shared schema on submit;
- POSTs `{ email }` with a 10 s timeout;
- on 200 or 429, calls `router.push("/r/<id>")`;
- on anything else, shows the danger Note, keeps the field's value and re-enables "Send my report";
- disables the button while the request is in flight, so a double tap sends once.

Back from the report to `/analyze` mounts the flow again at the guide, as a reload does today. The report link is the way back to the report.

`BOTID_PROTECT` gains `{ path: "/api/reports/*/email", method: "POST" }`. Task 5.3 first checks that `botid` 1.5 matches a `*` segment. If it does not, the client calls `checkBotId` through a fixed path `/api/reports/email`, with the id in the body, and decision 1's table changes.

### 7. The report view: one DOM, two layouts

`ReportView` (server) renders the season block, then the six or five sections, then the Premium card, the actions and the footer, in phone reading order. At `lg` (1024 px), a 12-column grid places the season block, the actions and the Premium card in columns 1–4, and the sections wrapper in columns 6–12 spanning those rows, as on the 1280 board. Swatch grids switch to 6 columns there, as the board does. One DOM keeps one tab order, and one state per button.

The client islands are small:

- `ShareButton`, used in the header and in the actions;
- `SaveButton`;
- `PremiumCard`;
- `ReportDraping`, which renders DrapingPair with `faceSrc` and, on the image's `error` event, renders it again without a face and with the deleted-photo line. The server does not ask storage first: the face route already answers 404, and a check would add a storage read to every report view.

A quiz-only record (`agreement === "quiz-only"`) gets no `ReportDraping`, and its overlines count to 5.

### 8. Share and save without losing the tap

iOS Safari refuses `navigator.share` once the tap's activation has been spent awaiting a fetch. So the report page fetches the story card and the palette image as `File`s when it mounts. They are static and cached, about 100 KB each. The tap then calls `share` at once.

- **Share:** `navigator.canShare({ files: [story] })` true: share the story with the spec's text. Otherwise, open an inline panel (a native `<dialog>`) showing both PNGs as `<img>` with `shareCardAlt` as alt text, each with an `<a download>` link. The panel follows boards "10e Share panel · no file sharing · 375" (a bottom sheet) and "10e Share panel · no file sharing · 1280" (a centred dialog): the title "Share my season", a close button, the line "Download a card, then post it from your photos.", then the story and post cards side by side, each captioned and with its "Download" button.
- **Save:** share the palette image the same way. Otherwise, click a hidden `<a download="seasonly-<slug>-palette.png">` holding an object URL.
- An `AbortError` (the person closed the sheet) changes nothing. Any other error falls back to the download path.

If the prefetch has not finished at the tap, the button waits for it. On iOS that may cost the activation, so the error path offers the download.

### 9. BL-03: the built share card uses the real fonts

A Vitest test renders Soft Autumn's story card and compares it, byte for byte, with a committed golden `e2e/fixtures/share-soft-autumn-story.png`. A Playwright test fetches `/images/share/soft-autumn/story` from the built server and compares it with the same golden. A missing font in the bundle changes the PNG, so the E2E fails.

Task 4.7 first renders the card twice, and under `next start`, to check that the bytes are stable on Linux. If they are not, it compares the IHDR plus a pixel hash, and if that is not stable either, BL-03 stays open with the finding.

### 10. What CI can and cannot prove

CI has no Supabase or Resend, so its reveals carry `reportId: null`. The proof splits three ways:

- **Unit:**
  - the report view, rendered from injected records (photo, quiz-only, personal, fallback, 12 seasons);
  - the email HTML and text, from injected records;
  - the routes, with injected stores and sender, and BotID mocked;
  - both migrations and the claim function, in PGlite on a stub `reports` table, as `reports` and `daily_cap` are tested.
- **E2E** (`e2e/report-delivery.spec.ts`, new):
  - `page.route` answers `/api/analyze` with a result carrying an id, and `/api/reports/*/email` with 200;
  - it checks the reveal's "Get my full report", the email step and its invalid-address error;
  - it checks that sending lands on `/r/<id>` (a 404 page in CI, which also proves `noindex`);
  - a second case answers `reportId: null` and checks "Try again".
- **Preview, with the user (task 8.3):**
  - one real analysis, an email to the user's inbox and the report from its link;
  - the draping preview, sharing and saving on the user's phone;
  - an interest tap and its row;
  - a forced read failure reaching Sentry.

## Risks / Trade-offs

- [Resend's free tier sends 100 emails a day] → Enough for the demand test, whose gate is 300 analyses in 30 days. A send over the limit is a Sentry error, and the report still opens. Upgrade when Sentry shows it.
- [The address is visible on the report page to anyone with the link, once Premium is tapped] → The user's choice, 2026-10-08. It never appears before the tap, and report ids are 128 random bits. `t8-photo-privacy` discloses it.
- [The footers say the photo is deleted within 24 hours, which is not true until `t8-photo-privacy` ships] → The gap the user accepted on 2026-10-06. The launch gate needs `t8-photo-privacy` archived.
- [BotID's path match may not take `*`] → Checked first (task 5.3), with the fixed-path fallback in decision 6.
- [The share sheet fails on some browsers after the prefetch] → The download panel is always the fallback. The preview check runs on the user's iPhone.
- [The golden PNG may differ across machines] → Generated and compared on Linux only. The E2E runs in CI's Linux container, and decision 9 has the fallback.
- [Previews send real emails] → Only to addresses typed into a preview, which today means the user's own. Rows are `is_test`.

## Migration Plan

1. The user verifies `seasonly.me` in Resend (SPF and DKIM records on the domain's DNS) and creates an API key restricted to sending. The key goes into Vercel (Production and Preview) and `.env.local`.
2. Write both migrations; test them in PGlite.
3. With the user's confirmation, apply both to the Supabase project `seasonly` through the connector, and rename the local files to the applied versions, as `crops_bucket` was.
4. Ship behind nothing: until this deploys, `/r/<id>` is a 404 and the reveal has no report button.

Rollback: revert the deploy. The tables stay, unread. Dropping them loses the collected addresses, so it needs the user's say.
