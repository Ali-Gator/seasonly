## MODIFIED Requirements

### Requirement: How it works describes the real checks

`/how-it-works` SHALL list every reason a photo is turned back, each under the title of its retake tip: "Too dark", "Tinted light", "Filter detected", "No face found" and "More than one face". The page SHALL say what happens when the photo and the quiz disagree, using the shared agreement copy: the photo counts for more. It SHALL NOT promise a correct result. The page SHALL link to `/sample-report`, `/privacy` and `/color-analysis-gpt-alternative`.

Where the page says when the face crop is uploaded, it SHALL say: after the photo passes the check and the quiz is finished. It SHALL NOT mention an agreement step, since the flow has none.

The FAQ answer to "What happens to my photo?" SHALL be, in the words of canvas v55 board HowItWorks: "Only a crop of your face is uploaded, after the photo passes the check and you finish the quiz. We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks. We keep your report, not your photo."

#### Scenario: All five rejections

- **WHEN** `/how-it-works` is rendered
- **THEN** it names "Too dark", "Tinted light", "Filter detected", "No face found" and "More than one face"

#### Scenario: Photo and quiz disagree

- **WHEN** `/how-it-works` is rendered
- **THEN** it says that when photo and quiz point different ways, the photo counts for more

#### Scenario: When the crop is uploaded

- **WHEN** `/how-it-works` is rendered
- **THEN** it says only a face crop is uploaded, after the photo passes the check and the quiz is finished, and it holds no "you agree"

#### Scenario: The FAQ names Google's copy

- **WHEN** `/how-it-works` is rendered
- **THEN** the answer to "What happens to my photo?" says "We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks." and holds no "It is deleted within 24 hours"

### Requirement: Famous people on a season page are sourced and credited

Each season page SHALL show three public figures typed as that season. Each figure SHALL have:

- a name;
- a photo from Wikimedia Commons under a license that allows reuse;
- a visible credit with the photo's author and license, linking to the photo's Commons page;
- a source for the season assignment: a published color analysis, linked.

The section SHALL say that these are readings of public photos and that no figure endorses Seasonly. A figure without a reusable photo and a source SHALL NOT be shown.

The name SHALL be the photo's caption: the photo and its name sit in one `figure`, the name in its `figcaption`, and the photo's `alt` is empty, so a screen reader reads the name once.

#### Scenario: A credited photo

- **WHEN** any season page is rendered
- **THEN** it shows three figures, each with a name, a photo, a credit naming the author and license and linking to Commons, and a linked source for the season

#### Scenario: No endorsement implied

- **WHEN** the famous-people section is rendered
- **THEN** it says these are readings of public photos and that no one shown endorses Seasonly

#### Scenario: The name is read once

- **WHEN** any season page is rendered
- **THEN** each famous photo has `alt=""` and sits in a `figure` whose `figcaption` holds that person's name
