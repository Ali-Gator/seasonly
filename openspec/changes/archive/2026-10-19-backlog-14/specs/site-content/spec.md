## ADDED Requirements

### Requirement: The sample face is labeled an example

Every draping pair on the sample face, on `/sample-report` and on `/color-analysis-gpt-alternative`, SHALL be followed by the caption of the approved canvas boards (v62): "An AI-made example face, to show how draping looks. These colors are not her analyzed result." The sample shows Soft Autumn's draping colors, while the analysis core reads the sample face as another season, so the page SHALL NOT present those colors as her result.

#### Scenario: The sample draping pair is captioned

- **WHEN** `/sample-report` or `/color-analysis-gpt-alternative` is rendered
- **THEN** its draping pair on the sample face is followed by "An AI-made example face, to show how draping looks. These colors are not her analyzed result."

### Requirement: The GPT-alternative page names only the filters the photo check catches

The photo check turns back a filter only from skin color no natural skin has, so it does not catch a soft beauty filter. Where `/color-analysis-gpt-alternative` lists what the photo check looks for, it SHALL say "strong color filters", in the words of the approved canvas boards (v62), and SHALL NOT claim that it checks for filters in general.

#### Scenario: The photo check's filter claim

- **WHEN** `/color-analysis-gpt-alternative` is rendered
- **THEN** its photo check section says the phone checks for "low light, tinted light, strong color filters, a missing face and more than one face", and holds no "tinted light, filters,"
