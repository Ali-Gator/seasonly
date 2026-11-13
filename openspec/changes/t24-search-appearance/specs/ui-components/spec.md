## ADDED Requirements

### Requirement: A swatch keeps its hex code out of search snippets

A swatch SHALL mark its hex code, and only its hex code, as text a search engine does not quote in a result snippet. The color's name SHALL stay quotable, so a snippet can list a palette by its names. The mark SHALL change nothing a person sees or a screen reader reads.

#### Scenario: A swatch's hex code is marked

- **WHEN** a swatch is rendered for `{ name: "Soft Blue", hex: "#6F95C8" }`
- **THEN** the element holding "#6F95C8" carries `data-nosnippet`, and the element holding "Soft Blue" does not

#### Scenario: A grid marks every hex code

- **WHEN** a swatch grid is rendered with the 24 best colors of a season in `PALETTES`
- **THEN** exactly 24 elements carry `data-nosnippet`, each holding one uppercase hex code, and the grid's text is the same as without the mark
