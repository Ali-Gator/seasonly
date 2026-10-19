## MODIFIED Requirements

### Requirement: A swatch grid shows every color of a list in order

A swatch grid SHALL render one swatch per color, in the order given, as a list that carries the grid's accessible label. It SHALL lay the swatches out in the number of columns asked for, and in 4 columns when none is given. A grid that would lay out in 4 columns SHALL lay out in 3 instead whenever each of its 4 cells would be narrower than 76 px, which on a phone means a window narrower than about 404 px, so a ten-letter name such as "Watermelon" stays inside its cell and a name such as "Light Warm Aqua" takes at most two lines. The rule SHALL follow the grid's own width, not the window's, so a design board draws it as the app does. A grid MAY be asked to keep its 4 columns on narrow phones; the 4-color season previews on `/seasons` and on a season page's neighbours do, since their names fit. A page that sets a grid's columns with its own column utility SHALL get that column count at every width it targets, the narrow-grid rule included, without marking the utility important.

#### Scenario: A season's palette renders as a grid

- **WHEN** a swatch grid is rendered with the 24 best colors of a season in `PALETTES`, the label "Your Soft Autumn palette" and 4 columns
- **THEN** it is one list labeled "Your Soft Autumn palette" with 24 items, the nth showing the nth color's name and uppercase hex

#### Scenario: No column count is given

- **WHEN** a swatch grid is rendered without a column count
- **THEN** it lays out in 4 columns

#### Scenario: A 4-column grid on a narrow phone

- **WHEN** a 4-column swatch grid is shown in a window 360 px wide
- **THEN** it lays out in 3 columns, and no swatch name overlaps the next swatch

#### Scenario: A 4-column grid at 375 px

- **WHEN** a 4-column swatch grid of Light Spring's best colors is shown in a window 375 px wide
- **THEN** it lays out in 3 columns, no swatch name runs out of its cell, and no name takes a third line

#### Scenario: A season preview on a narrow phone

- **WHEN** `/seasons` is shown in a window 360 px wide
- **THEN** each season's 4-color preview lays out in 4 columns

#### Scenario: A page overrides a grid's columns

- **WHEN** a page gives a 4-column swatch grid its own column utility, not marked important
- **THEN** the page's column count applies at every width the utility targets, narrow phones included

#### Scenario: A 4-column grid on a wide phone

- **WHEN** a 4-column swatch grid is shown in a window 414 px wide
- **THEN** it lays out in 4 columns
