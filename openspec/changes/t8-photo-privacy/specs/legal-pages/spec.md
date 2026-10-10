## Purpose

The privacy policy at `/privacy` and the terms of use at `/terms`. They tell a person what Seasonly does with their face crop and their data, who else receives it, how long each is kept and how to have it deleted, and on what terms the service is offered.

## ADDED Requirements

### Requirement: The privacy policy names what is stored and for how long

`/privacy` SHALL name each item Seasonly stores, with its purpose and how long it is kept:

- the face crop: kept for up to 24 hours after the analysis, for the report text and the draping preview;
- the report record: the season, the measured color traits, the quiz answers and the personal text; kept until the person asks for deletion;
- email addresses: up to 3 per report. Each is used to send the report and, for a report whose Premium button was tapped, one email when Premium launches. Kept until the person asks for deletion;
- the Premium interest record: kept until the person asks for deletion.

It SHALL say that the report link is the only key to a report. Anyone holding the link can open the report, can fetch the face crop while it is kept, and can read the address shown after Premium is tapped.

It SHALL say that the full photo never leaves the device. It SHALL say that face landmarks are found on the device and are never used to identify anyone. It SHALL say that neither Seasonly nor the AI provider uses the crop to train models.

#### Scenario: Reading the stored items

- **WHEN** a person reads `/privacy`
- **THEN** it names the face crop with "24 hours", the report record, the email addresses and the interest record, each with its purpose and how long it is kept

#### Scenario: The report link

- **WHEN** a person reads `/privacy`
- **THEN** it says that anyone holding the report link can open the report, fetch the crop while it is kept and see the address after Premium is tapped

### Requirement: The privacy policy names every service that receives data

`/privacy` SHALL name every outside service that receives data from a visit, and what it receives:

- Vercel: hosting, the BotID check on the analyze and email routes, Speed Insights;
- Supabase: the database and file storage, in the EU;
- Google, through Vercel AI Gateway: the face crop, the season, the measured traits and the quiz answers, for the report text (a quiz-only analysis sends nothing). Google does not train on them, but may keep them for a limited time to monitor abuse;
- Resend: the address and the report email;
- PostHog, EU: anonymous funnel events with report ids masked and no address. It sets a first-party cookie;
- Sentry, Germany: error reports, which can include a report id;
- jsDelivr and Google Cloud Storage: the browser downloads the face-detection code and model from them, so they see the visitor's IP address.
- Google, through the face-detection code: MediaPipe sends Google a usage log from the browser (which task ran and how long it took, never the photo), so Google sees the visitor's IP address. MediaPipe offers no switch to turn it off.

For each service, the page SHALL also say how long that service keeps what it receives, as the service's own documentation or account settings state it. A deletion request reaches Seasonly's own records, not these copies, and the page SHALL say so.

A service that receives data and is missing from the list is a defect in the page.

**Unenforced:** completeness is checked by recording the network requests of a full photo analysis, the email step and the report page on a deployment, and comparing their hosts with the list. The check is recorded in the change's tasks.

#### Scenario: The AI provider

- **WHEN** a person reads `/privacy`
- **THEN** it names Google and Vercel AI Gateway, says they get the face crop, says Google does not train on it, and says Google may keep it for a limited time to monitor abuse

#### Scenario: Every service

- **WHEN** a person reads `/privacy`
- **THEN** it names Vercel, Supabase, Google, Resend, PostHog, Sentry and jsDelivr, each with what it receives and how long it keeps it

### Requirement: The privacy policy says who runs Seasonly and how to use one's rights

`/privacy` SHALL give the operator's name and country and a contact email address. It SHALL say that a person can ask for a copy of their data, for its correction or for its deletion. It SHALL say that a request is answered within 30 days. It SHALL say what to send: the report link, or the email address. It SHALL say the person may complain to their data protection authority. It SHALL show the date it was last updated.

#### Scenario: Asking for deletion

- **WHEN** a person reads `/privacy`
- **THEN** it gives the contact address, says to send the report link or the email address, and says the request is answered within 30 days

### Requirement: The terms state what the service is and its limits

`/terms` SHALL say:

- that a result is an estimate for choosing colors, not professional, medical or other advice;
- the minimum age for using the service;
- that a person may upload only a photo of themselves;
- that the service is provided as is, with no warranty, and the limits of liability;
- that the terms may change, and how changes are announced;
- the governing law, and the operator's contact address.

It SHALL link to `/privacy` and show the date it was last updated.

#### Scenario: Reading the terms

- **WHEN** a person reads `/terms`
- **THEN** it states the result is an estimate, the minimum age, own photos only, no warranty, the governing law and the contact address, and links to `/privacy`

### Requirement: The legal pages are live and indexed

`/privacy` and `/terms` SHALL be marked ready. Each SHALL be served without `noindex` and SHALL appear in the sitemap. The text "Coming soon" SHALL appear on neither page.

#### Scenario: The privacy page is fetched

- **WHEN** `/privacy` is fetched
- **THEN** it carries no `noindex`, holds no "Coming soon", and `https://seasonly.me/privacy` is in the sitemap

#### Scenario: The terms page is fetched

- **WHEN** `/terms` is fetched
- **THEN** it carries no `noindex`, holds no "Coming soon", and `https://seasonly.me/terms` is in the sitemap
