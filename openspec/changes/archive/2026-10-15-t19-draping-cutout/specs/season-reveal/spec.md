## MODIFIED Requirements

### Requirement: The analyze route refuses malformed input before spending anything

`POST /api/analyze` SHALL answer 400 when the request fails validation, before claiming a daily slot, calling the model or storing anything. Validation fails when:

- the answers are missing, or hold an unknown question or value;
- a trait is missing or not a number from -1 to 1;
- the traits come without a crop, or a crop without traits;
- the crop is not a JPEG, or is larger than 512 KB;
- an outline comes without a crop;
- the outline is not a PNG, or is larger than 512 KB.

An outline is optional: a request with traits and a crop but no outline is valid.

#### Scenario: A trait out of range

- **WHEN** the request's temperature is 3
- **THEN** the route answers 400, and no slot is claimed and no model call is made

#### Scenario: A crop that is not a JPEG

- **WHEN** the crop is a PNG
- **THEN** the route answers 400, and no slot is claimed and no model call is made

#### Scenario: An outline without a crop

- **WHEN** the request carries answers and an outline, but no traits and no crop
- **THEN** the route answers 400, and no slot is claimed and no model call is made

#### Scenario: An outline that is not a PNG

- **WHEN** the request carries traits, a crop and an outline that is a JPEG
- **THEN** the route answers 400, and no slot is claimed and no model call is made

#### Scenario: A photo without an outline

- **WHEN** the request carries answers, traits and a crop, and no outline
- **THEN** the request passes validation

### Requirement: One report-text call per photo analysis, none without a photo

A request with traits and a crop SHALL make exactly one report-text call with that crop, the classifier's result and the answers. A quiz-only request SHALL make none, and its report SHALL use the static copy. The crop's outline SHALL NOT be sent to the model: it reads the crop with its background, whether an outline came or not.

#### Scenario: A photo analysis

- **WHEN** a valid request with a photo is analyzed
- **THEN** report text is requested once, with exactly the uploaded crop

#### Scenario: A quiz-only analysis

- **WHEN** a valid request with answers only is analyzed
- **THEN** no report text is requested, and the text source is `quiz-only`

#### Scenario: The outline stays out of the model call

- **WHEN** a valid request with a crop and an outline is analyzed
- **THEN** report text is requested once with exactly the uploaded crop, and the outline's bytes are not part of the call
