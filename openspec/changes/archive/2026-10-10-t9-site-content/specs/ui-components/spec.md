## MODIFIED Requirements

### Requirement: An icon is decorative unless it is labeled

An icon SHALL draw one of the design system's named glyphs (`check`, `cross`, `lock`, `camera`, `upload`, `sun`, `clock`, `trash`, `mail`, `info`, `arrow-right`) in the current text color, at a given pixel size (16 by default). Each name SHALL draw its Lucide icon: `check` → Check, `cross` → X, `lock` → Lock, `camera` → Camera, `upload` → Upload, `sun` → Sun, `clock` → Clock, `trash` → Trash2, `mail` → Mail, `info` → Info, `arrow-right` → ArrowRight. Without a label it SHALL be hidden from assistive technology. With a label it SHALL be an image with that label as its accessible name.

#### Scenario: A decorative icon

- **WHEN** an icon is rendered without a label
- **THEN** it is hidden from assistive technology

#### Scenario: A labeled icon

- **WHEN** an icon is rendered with the label "Locked"
- **THEN** it is an image whose accessible name is "Locked"

#### Scenario: A Lucide glyph

- **WHEN** an icon named `trash` is rendered at size 20
- **THEN** it draws Lucide's Trash2 glyph, 20 px wide and high, stroked in the current text color
