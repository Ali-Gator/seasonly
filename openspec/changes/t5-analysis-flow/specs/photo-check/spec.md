## MODIFIED Requirements

### Requirement: Each problem has its own retake tip

Each of the four problems SHALL have its own retake tip, and so SHALL `several-faces`. The check never reports `several-faces`: the web flow detects it from the face count, and the vision call can report it too. A tip has a title, a message saying what is wrong, a tip saying how to retake, and an icon name. All five SHALL be distinct. Each of the four SHALL equal the copy of its screen on the approved MVP canvas (`BadNoFace`, `BadDark`, `BadTint`, `BadFilter`). The several-faces tip SHALL equal the copy approved for it on the canvas.

#### Scenario: Four bad photos, four tips

- **WHEN** a no-face, a dark, a tinted and a filtered photo are each checked
- **THEN** each reports its own problem, and the four retake tips are distinct

#### Scenario: Tips match the canvas

- **WHEN** the retake tips are read
- **THEN** each title, message, tip and icon equals the copy on its canvas screen

#### Scenario: Several faces has its own tip

- **WHEN** the several-faces tip is read
- **THEN** it differs from the other four and equals its approved canvas copy
