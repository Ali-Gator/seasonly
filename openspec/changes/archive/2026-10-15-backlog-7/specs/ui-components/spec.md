## ADDED Requirements

### Requirement: A photo slot shows its image or a labeled placeholder

A photo slot SHALL render its image with the alt text it is given, empty when none is given, and SHALL show a text label in place of a missing image ("Photo" unless another label is given). A page MAY ask a slot to load its image lazily; the slot SHALL then mark its image for lazy loading, and SHALL otherwise leave the browser's default loading in place.

#### Scenario: A slot asked to load lazily

- **WHEN** a photo slot is given an image and asked to load it lazily
- **THEN** its image carries the alt text it was given and is marked for lazy loading

#### Scenario: A slot with no loading asked

- **WHEN** a photo slot is given an image and no loading
- **THEN** its image carries no loading attribute

#### Scenario: A slot with no image

- **WHEN** a photo slot is given no image
- **THEN** it shows its label, "Photo" by default, and renders no image
