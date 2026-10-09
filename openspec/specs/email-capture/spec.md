# email-capture Specification

## Purpose

Collects an email address after the reveal, stores it under the person's report and sends that report's link to it. The address is the price of the free full report during the demand test, and the list it builds is the only contact the product keeps.

## Public Interface

```typescript
// apps/web/src/lib/email/address.ts (no server imports: the step and the route share it)
export const EMAIL_ERROR: string; // "Enter an email like you@example.com"
export function parseEmail(value: unknown): string | null; // trimmed, lowercased, ≤ 254, local@domain.tld

// apps/web/src/lib/email/store.ts (server only)
export type StoreOutcome =
  | { kind: "stored"; emailId: number; season: SeasonSlug; quizOnly: boolean }
  | { kind: "limit" }
  | { kind: "unknown" }
  | { kind: "failed" };
export function storeReportEmail(
  reportId: string,
  email: string,
  opts?: { rpc?: StoreEmailRpc },
): Promise<StoreOutcome>; // never throws

// apps/web/src/lib/email/render.ts
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}
export function renderReportEmail(input: {
  id: string;
  season: SeasonSlug;
  quizOnly: boolean;
}): EmailContent;

// apps/web/src/lib/email/send.ts (server only)
export const FROM: string; // "Seasonly <report@seasonly.me>"
export function sendReportEmail(
  to: string,
  email: EmailContent,
  ids: { emailId: number; reportId: string },
  opts?: { fetch?: typeof fetch },
): Promise<void>; // never throws

// apps/web/src/app/api/reports/[id]/email/route.ts
export const maxDuration = 30;
export const POST: (
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) => Promise<Response>; // withErrorCapture
// body { email } → 200 { ok: true } | 400 | 403 (bot) | 404 | 429 (limit) | 500

// apps/web/src/app/(flow)/analyze/_email/step.tsx (client)
export function submitEmail(
  reportId: string,
  raw: string,
  opts?: { fetch?: typeof fetch },
): Promise<{ kind: "invalid" } | { kind: "open"; href: string } | { kind: "failed" }>;
export function EmailForm(props: {
  family: string;
  quizOnly: boolean;
  value: string;
  error: string | null;
  sending: boolean;
  failed: boolean;
  onChange;
  onSubmit;
  inputRef?;
}): JSX.Element;
export function EmailStep(props: {
  reportId: string;
  family: string;
  quizOnly: boolean;
}): JSX.Element;
```

```sql
-- supabase/migrations/20261009075315_report_emails.sql
create table public.report_emails (id bigint identity primary key, report_id text references reports on delete cascade,
  email text check (char_length(email) <= 254), created_at timestamptz, is_test boolean);
create function public.store_report_email(p_report_id text, p_email text, p_is_test boolean)
  returns table (outcome text, email_id bigint, season text, agreement text); -- security definer, service_role only
```

## Behavior

- The reducer's `open-email` pushes `{ name: "email", result }` from a reveal with a report id, so Back returns to the reveal. The step has no step progress.
- `submitEmail` checks the address with `parseEmail`, then POSTs `{ email }` through `postWithin` (10 s). 200 and 429 both open `/r/<id>` with `router.push`. Anything else shows the danger Note inside a `role="alert"` region and keeps the typed address. A bad address moves focus to the field. The button is `aria-disabled` while sending, so focus stays on it, and a second tap sends nothing.
- The route runs, in order: BotID (`isDevelopment` off Vercel), the id against `REPORT_ID`, the JSON body through `parseEmail`, then `store_report_email`. The function locks the report row, counts its addresses and inserts in one step. It returns the row id (the email's `Idempotency-Key`, `report-email/<id>`) with the report's season and agreement, so the route renders the email without a second read. The route answers, then `after()` sends.
- The email is template strings with every inserted string escaped: table layout, inline styles, colors from `tokens.json`, Georgia and system sans stacks, a hidden preview line, the season badge, and the first 4 highlights. `react-dom/server` cannot be used because it throws under the `react-server` condition that route handlers resolve.
- `sendReportEmail` POSTs to `https://api.resend.com/emails` through `withTimeout` (5 s). A non-2xx answer is thrown as `Resend answered <status> <name>`, never with Resend's message, which can echo the address.
- Sentry reports from the store and the send carry the report id and an error code, never the address. The store throws `store_report_email failed (<code>)` instead of the database error, whose details can hold the row.
- Checked on a preview deployment 2026-10-09: the email reached the Gmail Inbox, the 4th address got 429, and a POST without BotID's challenge got 403.

## Edge Cases

- The report link always points at `https://seasonly.me`, so an email sent from a preview links to a report that production only serves once this change is live.
- Resend's free tier sends 100 emails a day. A send over the limit is a Sentry error, and the report still opens.
- A cancelled `after()` (the function stopped) leaves an address stored with no email sent; the person still has the report open.
- Addresses are kept until `t8-photo-privacy` adds deletion and the privacy page names them.

## Requirements

### Requirement: The email step follows the canvas

Choosing "Get my full report" on the reveal SHALL show the email step of canvas artboard 09 inside `/analyze`: the overline "<Family> · your full report", the heading "Get your full report", the "What's inside" list, an email field labeled "Where should we send your report?" with the hint "We'll email you one link to your report. No newsletter unless you ask.", and "Send my report". A quiz-only result's list SHALL leave out "Your best and worst color, side by side".

#### Scenario: A photo result

- **WHEN** a person with an Autumn photo result chooses "Get my full report"
- **THEN** the email step shows "Autumn · your full report", "Free for now, while we are in early access.", six items ending with "Your best and worst color, side by side", the email field, "Send my report" and "Your report also opens on the next screen, so you can read it now.", and the URL is still `/analyze`

#### Scenario: A quiz-only result

- **WHEN** a person with a quiz-only result opens the email step
- **THEN** "What's inside" lists five items, without "Your best and worst color, side by side"

#### Scenario: Back from the email step

- **WHEN** a person on the email step presses the browser's Back
- **THEN** the reveal is shown again

### Requirement: The full report needs an email address

The flow SHALL offer no way from the reveal to the report other than the email step, and the email step SHALL NOT open the report before an address is stored for it, or the report has reached its limit of addresses.

#### Scenario: No skip

- **WHEN** the email step is shown
- **THEN** it offers no action that opens the report without sending the form

### Requirement: A malformed address is refused before anything is sent

An address that is empty, is not of the form `local@domain.tld`, or is longer than 254 characters SHALL be refused on the device with the error "Enter an email like you@example.com" on the field, and nothing SHALL be sent. The server SHALL refuse the same addresses with 400 and store nothing. Surrounding spaces SHALL be dropped and the address lowercased before it is checked and stored.

#### Scenario: A typo

- **WHEN** a person sends `maya.reyes@gmail`
- **THEN** the field shows "Enter an email like you@example.com" and no request leaves the device

#### Scenario: The route gets a malformed address

- **WHEN** the email route receives `not-an-email`
- **THEN** it answers 400, and nothing is stored or sent

### Requirement: Sending the form stores the address and opens the report

A valid address SHALL be stored under the report with the time it was given, as test data when it was given outside the production deployment. Once it is stored, the route SHALL answer success at once, and the step SHALL open `/r/<id>`. The email SHALL be sent after the answer, so the report never waits for the email provider.

#### Scenario: A valid address

- **WHEN** a person sends `Maya.Reyes@Gmail.com ` for report `k7m2qx…`
- **THEN** `maya.reyes@gmail.com` is stored under that report, `/r/k7m2qx…` opens, and one report email is sent to that address after the answer

#### Scenario: A preview deployment

- **WHEN** an address is stored from a preview deployment
- **THEN** its record is marked as test data

### Requirement: The report email carries the report link

The email SHALL come from `Seasonly <report@seasonly.me>` with the subject "Your <Season> color report". Following canvas artboard 12, it SHALL hold "Your color report is ready", the season with its tagline, a season badge, the season's first 4 highlights with names and hex codes, and "Open my report" with the plain link, both to `https://seasonly.me/r/<id>`. A plain-text part SHALL carry the same words and the link.

#### Scenario: A Soft Autumn report

- **WHEN** the report email is rendered for a Soft Autumn photo report with id `k7m2qx…`
- **THEN** its subject is "Your Soft Autumn color report", its preview text is "30 colors with names and hex codes, plus what to avoid.", it says "You're a Soft Autumn: warm, soft and earthy.", the badge reads "Soft Autumn" and "Autumn family", it shows Terracotta `#B4694F`, Deep Teal `#4C7774`, Camel `#C39D6F` and Dusty Rose `#C4918A` in that order, and both its button and its plain-text part link to `https://seasonly.me/r/k7m2qx…`

### Requirement: A quiz-only report email does not mention a photo

For a quiz-only report, the email SHALL say "here's what your quiz answers add up to" instead of "your selfie and quiz answers", and SHALL leave out the footer line about the photo.

#### Scenario: A quiz-only report

- **WHEN** the report email is rendered for a quiz-only report
- **THEN** it says "your quiz answers" and has no line about the photo

### Requirement: The report email links to the production site

The report link SHALL always point to `https://seasonly.me`, whichever deployment sent the email, since every deployment stores reports in the same database.

#### Scenario: Sent from a preview

- **WHEN** a preview deployment sends a report email
- **THEN** its link starts with `https://seasonly.me/r/`

### Requirement: A failed send never holds back the report

A send that fails, or has no answer from the provider within 5 s, SHALL be reported to Sentry and SHALL change nothing the person sees: the report has already opened. A deployment without the provider key SHALL send nothing and report the missing key to Sentry; outside a deployment it SHALL send nothing silently.

#### Scenario: The provider is down

- **WHEN** the provider answers 500 to a send
- **THEN** Sentry receives the failure and the report stays open

#### Scenario: Local run without a key

- **WHEN** an address is stored on a local run with no provider key
- **THEN** no send is attempted and nothing is reported

### Requirement: The address never reaches error reports or analytics

The email address SHALL be sent only to the email store and the email provider. Sentry reports about storing or sending SHALL NOT carry the address, and no analytics event SHALL carry it.

#### Scenario: A send fails

- **WHEN** a send to `maya.reyes@gmail.com` fails
- **THEN** the Sentry report names the report id and the failure, and not the address

### Requirement: A failed store keeps the person on the step

When storing the address fails (a network error, a server error or no answer within 10 s), the step SHALL keep the typed address, show "We couldn't send your report. Nothing is lost, so you can try again." and offer to send again. The store SHALL give up after 3 s and report the failure to Sentry.

#### Scenario: The database is down

- **WHEN** the email route cannot store the address
- **THEN** it answers 500, Sentry receives the error, and the step shows the error with the address still in the field

### Requirement: Only real reports take an address

The email route SHALL answer 404 for an id that is malformed or has no report, and SHALL store and send nothing. A malformed id SHALL be refused before any database request.

#### Scenario: An unknown id

- **WHEN** an address is sent for a well-formed id with no report
- **THEN** the route answers 404, and nothing is stored or sent

### Requirement: Only the server can read or write addresses

Stored addresses SHALL be readable and writable only with the server's secret key. A browser holding the public key SHALL NOT be able to read or write them.

#### Scenario: The public role reads addresses

- **WHEN** the database's anonymous role selects from or inserts into the stored addresses
- **THEN** it is refused with a permission error
