## MODIFIED Requirements

### Requirement: How it works describes the real checks

`/how-it-works` SHALL list every reason a photo is turned back, each under the title of its retake tip: "Too dark", "Tinted light", "Filter detected", "No face found" and "More than one face". The page SHALL say what happens when the photo and the quiz disagree, using the shared agreement copy: the photo counts for more. It SHALL NOT promise a correct result. The page SHALL link to `/sample-report`, `/privacy` and `/color-analysis-gpt-alternative`.

Where the page says when the face crop is uploaded, it SHALL say: after the photo passes the check and the quiz is finished. It SHALL NOT mention an agreement step, since the flow has none.

#### Scenario: All five rejections

- **WHEN** `/how-it-works` is rendered
- **THEN** it names "Too dark", "Tinted light", "Filter detected", "No face found" and "More than one face"

#### Scenario: Photo and quiz disagree

- **WHEN** `/how-it-works` is rendered
- **THEN** it says that when photo and quiz point different ways, the photo counts for more

#### Scenario: When the crop is uploaded

- **WHEN** `/how-it-works` is rendered
- **THEN** it says only a face crop is uploaded, after the photo passes the check and the quiz is finished, and it holds no "you agree"

### Requirement: The sample report is static and sends nothing

`/sample-report` SHALL show the full Soft Autumn report: the season, the agreement note, the six report sections and the draping preview on the sample face. It SHALL be marked as a sample above the season, and SHALL end with an action to `/analyze`. Its main heading SHALL name it a sample report, and it SHALL link to `/seasons/soft-autumn`, so it does not compete with the season page for the season's name.

The page SHALL have no share, save or Premium action. It SHALL make no request to `/api/`. It SHALL send none of the funnel's custom events: `quiz_completed`, `analysis_failed`, `report_requested`, `email_submitted`, `share_tapped`, `share_card_downloaded`, `palette_saved` and `premium_tapped`. PostHog's automatic events, such as `$pageview`, are sent as on every page.

#### Scenario: A sample, not a report

- **WHEN** `/sample-report` is rendered
- **THEN** it says it is a sample Soft Autumn report, its main heading names it a sample report, it links to `/seasons/soft-autumn`, it shows the six sections and a draping pair on the sample face, and it offers no share, save or Premium action

#### Scenario: Nothing is sent

- **WHEN** a person opens `/sample-report` and scrolls to the end
- **THEN** no request goes to `/api/`, and none of the funnel's custom events is sent
