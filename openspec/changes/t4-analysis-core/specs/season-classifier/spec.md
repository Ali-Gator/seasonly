## Purpose

Decides a person's season. It maps photo traits, quiz answers or both to one of the 12 seasons, with a confidence and a runner-up, and says whether photo and quiz agree. The result is the same for the same input on every run and on every surface.

## ADDED Requirements

### Requirement: The classifier returns one of the 12 seasons

The classifier SHALL take photo traits (temperature, value, clarity), quiz answers, or both, and SHALL return one season, a runner-up season different from it, a confidence, and the combined traits it classified. Both seasons SHALL be among the fixed slugs ({@link openspec/specs/site-structure/spec.md#requirement-the-12-season-slugs-are-fixed}). Each season SHALL have one reference point in trait space, and the result SHALL be the season whose reference point is nearest to the person's combined traits, with the second nearest as runner-up.

#### Scenario: Traits at a season's reference point

- **WHEN** photo traits equal the reference point of any of the 12 seasons, with no quiz answers
- **THEN** that season is returned

#### Scenario: Soft Autumn traits

- **WHEN** photo traits are warm-leaning, medium in value and soft
- **THEN** the season is `soft-autumn`

### Requirement: Confidence reflects the margin to the runner-up

Confidence SHALL be a number from 0 to 1 with two decimals. It SHALL be higher the further the nearest reference point is ahead of the second nearest, SHALL reach 1 only on a reference point, and SHALL be 0 when the two are equally near.

#### Scenario: On a reference point

- **WHEN** traits sit exactly on a season's reference point
- **THEN** confidence is 1

#### Scenario: Halfway between two seasons

- **WHEN** traits sit at the midpoint between two neighboring seasons' reference points
- **THEN** confidence is 0

#### Scenario: Closer to one season

- **WHEN** traits move from that midpoint toward one of the two seasons
- **THEN** confidence rises

### Requirement: Quiz answers move borderline photos

The four quiz answers SHALL each be one of the values the approved quiz offers: veins `green`, `blue`, `mix` or `unsure`; jewelry `gold`, `silver`, `both` or `unsure`; sun `burn`, `burn-tan`, `tan` or `unsure`; natural hair `dark`, `medium`, `blonde`, `red` or `unsure`. An `unsure` answer, and the neutral answers `mix`, `both`, `burn-tan` and `medium`, SHALL contribute nothing and SHALL count as no answer. With a photo, the answers SHALL shift the combined traits by less than the photo contributes, so they decide borderline cases without overriding a clear photo.

#### Scenario: A borderline photo with warm answers

- **WHEN** photo traits sit on the warm/cool border and the answers are green veins and gold jewelry
- **THEN** a warm season is returned

#### Scenario: A clearly cool photo with warm answers

- **WHEN** photo traits sit on a cool season's reference point and the answers are green veins and gold jewelry
- **THEN** a cool season is returned

#### Scenario: Unsure answers

- **WHEN** a photo is classified once with no answers and once with every answer `unsure`
- **THEN** both results are identical

### Requirement: The quiz alone classifies

Without photo traits, the classifier SHALL classify from quiz answers alone, with confidence no higher than 0.6. When there are no photo traits and every answer is `unsure` or neutral, it SHALL return no result rather than guess.

#### Scenario: Quiz only

- **WHEN** there are no photo traits and the answers are blue veins, silver jewelry, burns rarely tans, and blonde hair
- **THEN** a Summer season is returned, with confidence at most 0.6

#### Scenario: Nothing to go on

- **WHEN** there are no photo traits and every answer is `unsure`
- **THEN** no result is returned

#### Scenario: Only neutral answers

- **WHEN** there are no photo traits and the answers are veins `mix`, jewelry `both`, sun `burn-tan` and hair `medium`
- **THEN** no result is returned

### Requirement: Quiz answers from a client are validated

The core SHALL validate quiz answers that arrive as untrusted data. It SHALL accept only the four known questions with their known values, each question at most once, and SHALL refuse anything else with an error naming the offending field.

#### Scenario: An unknown answer value

- **WHEN** answers arrive with veins set to `purple`
- **THEN** validation fails, naming `veins`

#### Scenario: Missing answers

- **WHEN** answers arrive with only the jewelry question
- **THEN** validation passes, and the missing questions count as `unsure`

### Requirement: The result says whether photo and quiz agree

The result SHALL state one of `agree`, `differ`, `photo-only` or `quiz-only`. It SHALL be `photo-only` when there are photo traits and no answer counts, and `quiz-only` when there are no photo traits. Otherwise it SHALL be `differ` when the photo traits and the quiz answers alone point to opposite temperatures, each at least 0.15 from neutral, and `agree` when they do not.

#### Scenario: Warm photo, cool answers

- **WHEN** photo traits are warm and the answers are blue veins and silver jewelry
- **THEN** the result says `differ`

#### Scenario: A near-neutral photo

- **WHEN** photo temperature is 0.1 and the answers are blue veins and silver jewelry
- **THEN** the result says `agree`

#### Scenario: Photo without answers

- **WHEN** photo traits are given and every answer is `unsure`
- **THEN** the result says `photo-only`

### Requirement: The same input gives the same result

Classification SHALL use no randomness, clock, locale or environment. The same pixels, landmarks, hair mask and quiz answers, sampled and then classified, SHALL give an identical season, runner-up, confidence and agreement on every run.

#### Scenario: One photo analyzed twice

- **WHEN** the same synthetic image, landmarks and answers are sampled and classified twice in one process
- **THEN** both results are deeply equal

#### Scenario: One photo analyzed in separate processes

- **WHEN** the same synthetic image, landmarks and answers are sampled and classified in two separate Node processes
- **THEN** both results are deeply equal
