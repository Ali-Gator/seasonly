## MODIFIED Requirements

### Requirement: A button is a link when it navigates and a button when it acts

A button SHALL come in the design system's three variants (primary, secondary and ghost), with primary as the default. It SHALL take the full column width when asked. With a destination, it SHALL render a link to that destination. Without one, it SHALL render a native button that does not submit a form unless a submit type is given. A disabled or `aria-disabled` button SHALL keep its label and that attribute, and show the disabled style. A disabled or `aria-disabled` button with a destination SHALL NOT navigate: it SHALL render no `href`.

#### Scenario: A button without a destination

- **WHEN** a button is rendered without a destination
- **THEN** it is a native button with type `button`, in the primary variant

#### Scenario: A button with a destination

- **WHEN** a ghost button is rendered with destination `/analyze` at full width
- **THEN** it is a link to `/analyze` in the ghost variant at full width

#### Scenario: A disabled button

- **WHEN** a button labeled "Analyzing your photo" is rendered with `aria-disabled="true"`
- **THEN** it keeps `aria-disabled="true"` and its label text

#### Scenario: A disabled button with a destination

- **WHEN** a button with destination `/analyze` is rendered with `aria-disabled="true"`
- **THEN** it has no `href`, keeps `aria-disabled="true"` and shows the disabled style

## ADDED Requirements

### Requirement: An email input is labeled and states its error in words

EmailInput SHALL render a visible label tied to an email field that asks for the email keyboard and autofill (`type="email"`, `autocomplete="email"`, `inputmode="email"`). A hint or an error SHALL be tied to the field as its description. With an error, the field SHALL be marked invalid, and the error SHALL show a cross icon and start with "Error:" for assistive technology, so it is never told by color alone.

#### Scenario: A hint

- **WHEN** EmailInput renders with the label "Where should we send your report?" and a hint
- **THEN** the field is named by that label and described by the hint

#### Scenario: An error

- **WHEN** EmailInput renders with the error "Enter an email like you@example.com"
- **THEN** the field has `aria-invalid="true"`, is described by the error, and the error reads "Error: Enter an email like you@example.com" to assistive technology
