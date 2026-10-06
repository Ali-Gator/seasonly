## Purpose

Turns a checked photo's traits, its face crop and the quiz answers into a season on the server, and stores it as a report record. It then reveals the season family. The server writes every stored word, so a report link can only ever show what the analysis produced.

## ADDED Requirements

### Requirement: The analyze route refuses malformed input before spending anything

`POST /api/analyze` SHALL answer 400 when the request fails validation, before claiming a daily slot, calling the model or storing anything. Validation fails when:

- the answers are missing, or hold an unknown question or value;
- a trait is missing or not a number from -1 to 1;
- the traits come without a crop, or a crop without traits;
- the crop is not a JPEG, or is larger than 512 KB.

#### Scenario: A trait out of range

- **WHEN** the request's temperature is 3
- **THEN** the route answers 400, and no slot is claimed and no model call is made

#### Scenario: A crop that is not a JPEG

- **WHEN** the crop is a PNG
- **THEN** the route answers 400, and no slot is claimed and no model call is made

### Requirement: The server decides the season

The route SHALL classify the request's traits and answers with the core classifier on the server. No season, confidence or text sent by the client SHALL be used.

#### Scenario: A photo and answers

- **WHEN** the request carries a Soft Autumn reference point's traits and no answers
- **THEN** the response's season is `soft-autumn`, as the classifier gives

### Requirement: One report-text call per photo analysis, none without a photo

A request with traits and a crop SHALL make exactly one report-text call with that crop, the classifier's result and the answers. A quiz-only request SHALL make none, and its report SHALL use the static copy.

#### Scenario: A photo analysis

- **WHEN** a valid request with a photo is analyzed
- **THEN** report text is requested once, with exactly the uploaded crop

#### Scenario: A quiz-only analysis

- **WHEN** a valid request with answers only is analyzed
- **THEN** no report text is requested, and the text source is `quiz-only`

### Requirement: A rejected photo stores nothing and asks for a retake

When the report-text call rejects the photo as `no-face` or `several-faces`, the route SHALL store nothing and answer with that problem. The flow SHALL show the retake screen with that problem's retake tip. The quiz answers SHALL be kept.

#### Scenario: Several faces

- **WHEN** the report-text call rejects the photo as `several-faces`
- **THEN** no report is stored and the retake screen shows the several-faces tip

### Requirement: A result is stored under an unguessable id

A season result SHALL be stored as one report record under an id of 128 random bits, written in URL-safe base64. The record SHALL hold:

- the season, the runner-up, the confidence and the agreement case;
- the traits and the answers;
- the photo verdict, or none when no model call judged the photo (quiz-only or a fallback);
- the text source: `personal`, a fallback reason or `quiz-only`;
- the personal summary and note, only when the source is `personal`.

It SHALL NOT hold the photo, the crop or any contact detail. A record written outside the production deployment SHALL be marked as test data. The response SHALL carry the id.

#### Scenario: A personal result

- **WHEN** a photo analysis gets personal text
- **THEN** one report record holds the season, the verdict `ok`, the source `personal`, the summary and the note, and the response carries its 22-character id

#### Scenario: A preview deployment

- **WHEN** a result is stored from a preview deployment
- **THEN** its record is marked as test data

### Requirement: A failed save never blocks the reveal

When the report record cannot be stored, the response SHALL still carry the season result with no report id. The failure SHALL be reported to Sentry. The save SHALL give up after 3 s.

#### Scenario: The database is down

- **WHEN** storing the record fails
- **THEN** the response carries the season and a null report id, and Sentry receives the error

### Requirement: Only the server can read or write reports

Report records SHALL be readable and writable only with the server's secret key. A browser holding the public key SHALL NOT be able to read or write them.

#### Scenario: The public role reads reports

- **WHEN** the database's anonymous role selects from or inserts into the reports
- **THEN** it is refused with a permission error

### Requirement: Quiz answers with nothing to classify show a no-result screen

When a quiz-only request has no answer that moves any trait (`no-answers`), or has answers that cancel out (`answers-cancel`), the route SHALL answer with that reason and store nothing. The flow SHALL show the no-result screen. That screen offers to change the answers or to add a photo. The flow SHALL send one `quiz_no_result` event with the reason and the answers.

#### Scenario: Answers that cancel out

- **WHEN** a quiz-only request's answers sum to zero on every trait
- **THEN** the no-result screen is shown, one `quiz_no_result` event carries `answers-cancel` and the answers, and nothing is stored

### Requirement: The analyzing step follows the canvas and fails visibly

While the request runs, the flow SHALL show the analyzing screen of canvas artboard 07, with these parts:

- the face crop, or no image on the quiz-only path;
- "Reading your colors";
- a progress bar;
- the four step lines.

When the request fails, the flow SHALL show the error screen, which offers to try again. A failure is a network error, a non-success answer, or no answer within 45 s. Trying again SHALL re-send the same request.

#### Scenario: The route refuses the request

- **WHEN** the analyze route answers 403
- **THEN** the error screen is shown, and choosing to try again sends the same request

### Requirement: The reveal shows the season family

A season result SHALL show the reveal of canvas artboard 08:

- the overline "Your season family";
- the family name;
- the season's tagline;
- the season's reveal line;
- the note "One more step to your subtype", with "<Family> has three subtypes. Your full report names yours and gives you 30 colors.";
- "Retake my photo".

A quiz-only result SHALL say that it comes from the quiz alone, and SHALL offer to add a photo instead of a retake. The subtype's name SHALL NOT appear on the reveal.

#### Scenario: A Soft Autumn result

- **WHEN** the result is Soft Autumn
- **THEN** the reveal shows "Autumn", "Warm, soft and earthy." and "Colors with a golden base and a little dust in them work with you. Bright, icy and very dark colors compete.", and not "Soft Autumn"

#### Scenario: Retake from the reveal

- **WHEN** the person chooses "Retake my photo"
- **THEN** the capture step is shown, and the quiz answers are kept

### Requirement: Each analysis outcome is reported without photo data

Each season result and each rejection SHALL send one `analysis_result` event. The event SHALL carry:

- the outcome: `result` or `rejected`;
- the photo verdict, or none when no model call judged the photo;
- the text source, or the rejection problem;
- for a result, the season, the agreement case and the confidence.

It SHALL NOT carry the image, the report id or the personal text. With PostHog off, no event SHALL be sent and the flow SHALL work the same.

#### Scenario: The daily cap is reached

- **WHEN** a photo analysis falls back because the daily cap is reached
- **THEN** one `analysis_result` event carries the outcome `result`, no photo verdict and the text source `capped`

### Requirement: The route outlasts its slowest path

The analyze route's time limit SHALL be 60 s. Its slowest path is a 3 s slot claim, a 20 s model call and a 3 s save, so a slow model call falls back before the platform stops the function.

#### Scenario: The declared limit

- **WHEN** the analyze route's configuration is read
- **THEN** its maximum duration is 60 s

### Requirement: Landing to reveal in under 30 seconds

On a 390 × 844 viewport, a person SHALL be able to go from the landing page to the reveal in under 30 s, by uploading a good photo and answering the quiz. The E2E run that proves it SHALL NOT claim a daily slot, call the model or store a report, wherever it runs, locally or in CI.

**Unenforced:** real phones and networks vary. CI proves the path with the static fallback, because CI has no model access. Task 8.3's manual check on a phone, against a preview deployment, times the real path.

#### Scenario: The E2E path

- **WHEN** the E2E test opens the landing, starts the analysis, uploads the fixture face, agrees and answers four questions
- **THEN** the reveal is shown within 30 s of opening the landing

#### Scenario: The E2E run spends nothing

- **WHEN** the E2E test's analyze request is answered
- **THEN** its text source is not `personal` and its report id is null
