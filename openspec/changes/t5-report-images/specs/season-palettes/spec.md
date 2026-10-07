## ADDED Requirements

### Requirement: Every palette names six highlight colors

Each of the 12 palettes SHALL name exactly 6 highlight colors, in order. Each highlight SHALL equal, by name and hex, one of that palette's best colors or neutrals, and no highlight SHALL appear twice. The order is the order surfaces show them in: a surface that shows fewer than 6 SHALL show the first ones. Soft Autumn's highlights SHALL be the canvas share card's colors: Terracotta `#B4694F`, Deep Teal `#4C7774`, Camel `#C39D6F`, Dusty Rose `#C4918A`, Olive `#7B7848` and Mushroom `#A08F7E`. The highlights of the other 11 seasons are palette data, so "Palettes are approved before they ship" applies to them.

#### Scenario: All 12 palettes

- **WHEN** any season's highlights are read
- **THEN** there are 6, each is one of that palette's best colors or neutrals, and no two are the same

#### Scenario: Soft Autumn's highlights

- **WHEN** the Soft Autumn highlights are read
- **THEN** they are Terracotta, Deep Teal, Camel, Dusty Rose, Olive and Mushroom, in that order, with the canvas hex codes
