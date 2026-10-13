## MODIFIED Requirements

### Requirement: The quiz alone classifies

Without photo traits, the classifier SHALL classify from quiz answers alone, with confidence no higher than 0.6. When there are no photo traits and every answer is `unsure` or neutral, or the answers cancel out on every trait (green veins with silver jewelry), it SHALL return no result rather than guess. A no-result SHALL say which of the two it was (`no-answers` or `answers-cancel`), so the caller can report answers that contradict each other. The quiz alone SHALL NOT give Soft Autumn, Soft Summer or Bright Spring: only dark hair touches clarity, so those three seasons need a photo.

#### Scenario: Quiz only

- **WHEN** there are no photo traits and the answers are blue veins, silver jewelry, burns rarely tans, and blonde hair
- **THEN** a Summer season is returned, with confidence at most 0.6

#### Scenario: Nothing to go on

- **WHEN** there are no photo traits and every answer is `unsure`
- **THEN** no result is returned, with the reason `no-answers`

#### Scenario: Only neutral answers

- **WHEN** there are no photo traits and the answers are veins `mix`, jewelry `both`, sun `burn-tan` and hair `medium`
- **THEN** no result is returned, with the reason `no-answers`

#### Scenario: Answers that cancel out

- **WHEN** there are no photo traits and the answers are green veins and silver jewelry
- **THEN** no result is returned, with the reason `answers-cancel`

#### Scenario: Seasons only a photo gives

- **WHEN** all 750 quiz answer combinations, each question answered with one of its values or left blank, are classified without photo traits
- **THEN** none gives Soft Autumn, Soft Summer or Bright Spring
