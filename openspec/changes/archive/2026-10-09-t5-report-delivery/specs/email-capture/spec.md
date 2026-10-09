## Purpose

Collects an email address after the reveal, stores it under the person's report and sends that report's link to it. The address is the price of the free full report during the demand test, and the list it builds is the only contact the product keeps.

## ADDED Requirements

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
