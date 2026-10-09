## MODIFIED Requirements

### Requirement: The reveal shows the season family

A season result SHALL show the reveal of canvas artboard 08:

- the overline "Your season family";
- the family name;
- the season's tagline;
- the season's reveal line;
- the note "One more step to your subtype", with "<Family> has three subtypes. Your full report names yours and gives you 30 colors.";
- "Get my full report", which opens the email step;
- "Retake my photo".

A quiz-only result SHALL say that it comes from the quiz alone, and SHALL offer to add a photo instead of a retake. The subtype's name SHALL NOT appear on the reveal.

#### Scenario: A Soft Autumn result

- **WHEN** the result is Soft Autumn
- **THEN** the reveal shows "Autumn", "Warm, soft and earthy." and "Colors with a golden base and a little dust in them work with you. Bright, icy and very dark colors compete.", and not "Soft Autumn"

#### Scenario: Retake from the reveal

- **WHEN** the person chooses "Retake my photo"
- **THEN** the capture step is shown, and the quiz answers are kept

#### Scenario: Get my full report

- **WHEN** the person chooses "Get my full report" on a result with a report id
- **THEN** the email step is shown for that report

## ADDED Requirements

### Requirement: A reveal without a report id offers to try again

When a result comes with no report id, because its save failed, the reveal SHALL NOT offer "Get my full report". It SHALL show the note "We couldn't save your report" with "Your season is below, but your full report needs one more try." and offer "Try again", which re-sends the same request. The rest of the reveal SHALL stay as it is.

#### Scenario: The save failed

- **WHEN** the analyze response carries a season and a null report id
- **THEN** the reveal shows the family, "We couldn't save your report" and "Try again", and no "Get my full report"

#### Scenario: Trying again

- **WHEN** the person chooses "Try again" on that reveal
- **THEN** the analyzing step is shown and the same request is sent again
