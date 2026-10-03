## ADDED Requirements

### Requirement: Step progress names the current step in text

The step progress SHALL show "Step n of 3" and the steps Photo, Quiz and Result as an ordered list in a navigation region labeled "Progress". The current step SHALL be marked as the current step for assistive technology. Each finished step SHALL show a check icon and say "(done)" to assistive technology, so progress is never told by color alone.

#### Scenario: On the quiz

- **WHEN** the step progress renders with the second step current
- **THEN** it reads "Step 2 of 3", Quiz is marked as the current step, and Photo carries a check and a hidden "(done)"

### Requirement: A quiz option is a native radio inside its label

A quiz option SHALL render a native radio input inside a label that holds the option's label and, when given, its description. Every other prop, such as `name`, `value`, `checked` and `onChange`, SHALL pass through to the input.

#### Scenario: An option with a description

- **WHEN** a quiz option renders with name `veins`, value `green`, label "Green or olive" and description "Often a warm undertone"
- **THEN** it is a label holding a radio input named `veins` with value `green`, and the texts "Green or olive" and "Often a warm undertone"

### Requirement: A camera frame shows its view, a hidden guide and its caption

A camera frame SHALL render a figure holding its view, the face guide oval and the caption. The view is a live video or an image passed in by the caller, or a labeled placeholder when nothing is passed. The oval SHALL be hidden from assistive technology. The caption SHALL be the figure's caption. The guide SHALL be left out when it is turned off.

#### Scenario: A frame with a caption

- **WHEN** a camera frame renders with the caption "Fit your face in the oval, at eye level. Hold still."
- **THEN** it is a figure whose caption is that text, with a guide oval hidden from assistive technology

#### Scenario: No guide

- **WHEN** a camera frame renders with the guide turned off
- **THEN** it has no guide oval

### Requirement: A photo tip card tells good from bad in words

A photo tip card SHALL show its title as a heading, its body, and two examples, a good one and a bad one. Each example SHALL be a figure with its image, or a labeled placeholder, and a caption that holds a verdict word and the example's caption. The verdict words SHALL be "Good" for the good example and "Avoid" for the bad one, each with an icon, so the verdict is never told by color alone.

#### Scenario: The light tip

- **WHEN** a tip card renders with the title "Face a window", the good caption "Facing a window" and the bad caption "Under a ceiling lamp"
- **THEN** it shows the heading "Face a window", "Good" with "Facing a window", and "Avoid" with "Under a ceiling lamp"
