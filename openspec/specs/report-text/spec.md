# report-text Specification

## Purpose

The words of a person's report. The analysis core holds fixed copy for each season and each photo/quiz agreement case. One vision-model call per analysis writes the personal parts and double-checks the photo. When that call is not made or fails, the fixed copy stands in, so every report has its words.

## Public Interface

```typescript
// packages/analysis/src/report-text/, re-exported from "@seasonly/analysis"
interface SeasonCopy {
  tagline: string; // ≤ 60
  summary: string; // ≤ 600
  undertone: string; // ≤ 40
  chroma: string; // ≤ 40
  contrast: string; // ≤ 40
  neutralsIntro: string; // ≤ 160
  metalsIntro: string; // ≤ 160
  makeupIntro: string; // ≤ 160
  hairTip: string; // ≤ 160
  drapingLine: string; // ≤ 120, names the season's draping pair
}
interface AgreementCopy {
  title: string; // ≤ 40
  body: string; // ≤ 240, the fallback note
}
const SEASON_COPY: Record<SeasonSlug, SeasonCopy>;
const AGREEMENT_COPY: Record<Agreement, AgreementCopy>;
const COPY_LIMITS: { [K in keyof SeasonCopy | "noteTitle" | "noteBody"]: number };

// apps/web/src/lib/report-text/ (server only)
const REPORT_TEXT_MODEL = "google/gemini-3.8-flash";
type PhotoVerdict = "ok" | "no-face" | "several-faces" | "filter" | "heavy-makeup";
type FallbackReason = "capped" | "cap-unavailable" | "failed" | "timeout" | "invalid";
type ReportTextResult =
  | {
      kind: "personal";
      summary: string;
      agreementNote: string;
      photo: "ok" | "filter" | "heavy-makeup";
    }
  | { kind: "static"; reason: FallbackReason }
  | { kind: "rejected"; problem: "no-face" | "several-faces" };
function generateReportText(input: {
  faceCrop: Uint8Array; // JPEG
  result: SeasonResult;
  answers: QuizAnswers;
  claimSlot?: () => Promise<"granted" | "capped" | "unavailable">; // test seam
  model?: LanguageModel; // test seam
}): Promise<ReportTextResult>;
```

## Behavior

- `generateReportText` claims a daily slot first (`abuse-controls`), then makes one `generateText` call through the AI Gateway: structured output against a strict zod schema (`photo`, `summary` ≤ 700, `agreementNote` ≤ 300), `maxRetries: 0`, and an abort after 20 s. One user message carries the prompt text and the face crop as its only image.
- The prompt gives the season, its family, the runner-up, the agreement case, the three traits with their signs, the quiz answers in words and the season's fixed summary as a voice anchor. It tells the model the season is decided, and states the coloring-only rules.
- Outcomes map to a returned value, never a throw: an abort is `timeout`; `NoObjectGeneratedError` or `NoOutputGeneratedError` is `invalid`; any other error is `failed`; a `no-face` or `several-faces` verdict is `rejected`; anything else is `personal`.
- Every fallback except `capped` reports `Error("report-text fallback: <reason>", { cause })` to Sentry and awaits `Sentry.flush(2000)`. Worst case inside the function: 3 s claim + 20 s call + 2 s flush = 25 s.
- On `static`, the page shows `SEASON_COPY[season].summary` and `AGREEMENT_COPY[agreement].body`. On `personal`, it shows the two personal strings in their place. The note title always comes from `AGREEMENT_COPY`.
- Quiz-only results make no call; the caller uses the fixed copy.
- The paid smoke run (`pnpm test:smoke`, `report-text.smoke.ts`) makes three calls on `evals/photos/smoke.jpg` and writes them to `evals/photos/smoke-output.json`. It runs only with the user's approval.

## Edge Cases

- Zero data retention is not requested: the Gateway refuses it on the Vercel Hobby plan with a 403. Upgrading to Pro and setting `providerOptions.gateway.zeroDataRetention: true` restores it.
- A second person anywhere in the frame, even blurred in the background, gives `several-faces` and a retake. `t6-eval-set` measures how often that rejects a usable selfie.
- A model that runs a little over the fixed copy's 600/240 characters is still used; the schema allows 700/300.
- A provider refusal with no text reads as `invalid`, the same as output that fails the schema; the Sentry cause tells them apart.
- A slot spent on a call that then fails is not refunded: the cap guards cost, and a failed call can still cost tokens.

## Requirements

### Requirement: Every season has its report copy

The analysis core SHALL hold, for each of the 12 seasons, the season-level report copy:

- a tagline
- a summary paragraph
- an undertone, a chroma and a contrast line
- an intro for the neutrals, the metals and the makeup sections
- a hair tip
- a draping line

Every string SHALL be non-empty. Each string SHALL be no longer than the limit for its field, so the report layout holds.

#### Scenario: All 12 seasons

- **WHEN** the report copy of each season is read
- **THEN** every field is present, non-empty and within its length limit

#### Scenario: Soft Autumn against the canvas

- **WHEN** the Soft Autumn copy is read
- **THEN** its tagline is "Warm, soft and earthy.", its undertone is "Warm, leaning neutral", its hair tip is "Go one or two shades warmer than your natural color. Skip ash blonde and blue-black." and its draping line is "Terracotta warms your skin; fuchsia competes with it.", as on the approved MVP canvas's full report (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3)

### Requirement: Every agreement case has a note

The analysis core SHALL hold a note title and a fallback note body for each of the classifier's four agreement cases: `agree`, `differ`, `photo-only` and `quiz-only`. Each string SHALL be non-empty and within its length limit.

#### Scenario: All four cases

- **WHEN** the note for each agreement case is read
- **THEN** it has a non-empty title and body within their limits, and the `agree` title is "Photo and quiz agree"

### Requirement: Report copy is approved before it ships

The copy of the 11 seasons other than Soft Autumn, and the four agreement notes, SHALL be reviewed and approved by the user before they are committed as data.

**Unenforced:** whether copy reads right is a human judgment; the change's task list gates it on the user's approval.

#### Scenario: Drafted copy

- **WHEN** a season's copy is drafted
- **THEN** it is shown to the user and committed only after approval

### Requirement: One vision call per analysis

Writing the personal text for one analysis SHALL make at most one model call. A failed, timed-out or invalid call SHALL NOT be retried.

#### Scenario: A valid answer

- **WHEN** the model returns schema-valid output
- **THEN** exactly one model call was made, and the personal summary, agreement note and photo verdict are returned

#### Scenario: An invalid answer

- **WHEN** the model returns output that fails the schema
- **THEN** exactly one model call was made and the static copy is used, with the reason `invalid`

#### Scenario: A provider error

- **WHEN** the model call throws
- **THEN** exactly one model call was made and the static copy is used, with the reason `failed`

### Requirement: Personal text is schema-valid or unused

The model's output SHALL be checked against one schema before use. The schema has three fields:

- a summary of the person's visible coloring, within its length limit;
- an agreement-note body, within its length limit;
- a photo verdict of `ok`, `no-face`, `several-faces`, `filter` or `heavy-makeup`.

Output that does not match SHALL NOT reach the report.

#### Scenario: A summary over its limit

- **WHEN** the model returns a summary longer than the limit
- **THEN** the output is rejected and the static copy is used, with the reason `invalid`

#### Scenario: An unknown verdict

- **WHEN** the model returns a photo verdict outside the five values
- **THEN** the output is rejected and the static copy is used, with the reason `invalid`

### Requirement: The classifier owns the season

The model SHALL be given the classifier's result and the quiz answers:

- the season;
- the runner-up;
- the agreement case;
- the traits.

The model SHALL NOT be asked for a season, and nothing the model returns SHALL change the season.

#### Scenario: The request

- **WHEN** personal text is requested for a Soft Autumn result
- **THEN** the request names Soft Autumn, and the output schema has no season field

### Requirement: Only the face crop is sent

A call SHALL carry exactly one image, the face crop it was given, and no other photo or personal data.

Zero data retention is not requested: the AI Gateway offers it only on Vercel Pro and Enterprise plans, and the project is on Hobby. The provider's own retention policy applies, and the privacy page says so.

#### Scenario: The request's image

- **WHEN** personal text is requested
- **THEN** the request carries one image, equal to the given face crop

### Requirement: The photo double-check

When the photo verdict is `no-face` or `several-faces`, the analysis SHALL be rejected: no report text is returned, and the verdict is returned so the flow can ask for a retake. When it is `filter` or `heavy-makeup`, the personal text SHALL be used, and the verdict SHALL be returned with it so it can be recorded.

#### Scenario: Two faces

- **WHEN** the model's verdict is `several-faces`
- **THEN** the analysis is rejected with the problem `several-faces` and no text

#### Scenario: Heavy makeup

- **WHEN** the model's verdict is `heavy-makeup`
- **THEN** the personal text is returned together with the verdict `heavy-makeup`

### Requirement: A call is made only with a claimed daily slot

A daily slot SHALL be claimed ({@link openspec/specs/abuse-controls/spec.md#requirement-vision-calls-are-capped-per-utc-day}) before every model call. When the cap is reached, or the counter cannot be reached, no call SHALL be made and the static copy SHALL be used.

#### Scenario: Cap reached

- **WHEN** the slot claim answers that the cap is reached
- **THEN** no model call is made and the static copy is used, with the reason `capped`

#### Scenario: Counter unreachable

- **WHEN** the slot claim answers that the counter is unavailable
- **THEN** no model call is made and the static copy is used, with the reason `cap-unavailable`

### Requirement: A slow call gives way to the static copy

A model call that has not answered within 20 seconds SHALL be aborted, and the static copy SHALL be used, so the flow stays under its 30-second budget.

#### Scenario: A call that hangs

- **WHEN** the model does not answer within 20 seconds
- **THEN** the call is aborted and the static copy is used, with the reason `timeout`

### Requirement: Failures are reported, the cap is not

Falling back for the reasons `failed`, `timeout`, `invalid` and `cap-unavailable` SHALL report an error to Sentry, naming the reason. Falling back for `capped` SHALL NOT, because reaching the cap is expected.

#### Scenario: An invalid answer is reported

- **WHEN** the static copy is used with the reason `invalid`
- **THEN** one error naming `invalid` is reported to Sentry

#### Scenario: The cap is not reported

- **WHEN** the static copy is used with the reason `capped`
- **THEN** nothing is reported to Sentry

### Requirement: The personal text describes coloring only

The model SHALL be instructed:

- to write in the second person;
- to describe only the visible coloring of skin, hair and eyes and how it fits the given season;
- not to mention ethnicity, race, age, body, health or attractiveness;
- in the agreement note, to explain what the photo and the quiz answers each pointed to.

**Unenforced:** whether generated prose follows its instructions is a semantic judgment; the paid smoke run and `t6-eval-set` review it.

#### Scenario: A generated summary

- **WHEN** the smoke run's summary is read
- **THEN** it describes skin, hair and eye coloring and mentions none of the excluded topics
