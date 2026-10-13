## MODIFIED Requirements

### Requirement: A stored report renders the canvas report

`/r/<id>` for a stored report SHALL render canvas artboard "10 Full report · 375" for the record's season: the season block (name, tagline, summary, undertone, chroma, contrast and the agreement note), then six numbered sections (palette, colors to avoid, best neutrals, metals, makeup and hair, draping preview), then the Premium card, "Share my season", "Save my palette" and the footer. Every color SHALL show its name and hex code.

Below 1024 px wide, section 1 (the palette) SHALL come straight after the season name and tagline, and the rest of the season block (summary, traits and agreement note) SHALL follow it, before section 2. From 1024 px, the season block SHALL stay whole in the left column, as the wide layout requires.

#### Scenario: A Soft Autumn report

- **WHEN** `/r/<id>` is opened for a stored Soft Autumn photo report
- **THEN** it shows the overline "Your season", "Soft Autumn" and "Warm, soft and earthy."
- **AND** the sections read "Section 1 of 6 · Your palette" (24 colors, Soft Coral `#D88E77` first), "Section 2 of 6 · Colors to avoid", "Section 3 of 6 · Your best neutrals" (6 colors, Espresso `#4A3A33` last), "Section 4 of 6 · Your metals" ("Wear" and "Go easy on"), "Section 5 of 6 · Makeup and hair" (lips, blush, eyes, the hair tip and hair) and "Section 6 of 6 · Draping preview", in that order

#### Scenario: The palette comes first on a phone

- **WHEN** a stored report is opened in a 375 × 812 window
- **THEN** the first palette swatch is inside the window without scrolling, and the summary and the agreement note come after the palette and before "Section 2 of 6"
