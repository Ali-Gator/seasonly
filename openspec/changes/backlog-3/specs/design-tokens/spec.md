## MODIFIED Requirements

### Requirement: The type styles are classes with the design-system values

`globals.css` SHALL define the classes `.display`, `.h1`, `.h2`, `.h3`, `.quote`, `.lead`, `.body`, `.label`, `.caption`, `.hex` and `.overline`, each with the font family, size, line height, weight, letter spacing, style and optical size its type style has in `tokens.json`. No type class SHALL draw a text decoration: a utility of the same name (Tailwind's `overline` draws a line above the text) SHALL NOT apply to it.

#### Scenario: A type style differs from tokens.json

- **WHEN** a class's font size, line height or weight differs from its type style in `tokens.json`
- **THEN** the unit suite fails, naming the class and the property

#### Scenario: A kicker on a page

- **WHEN** a page with an `.overline` kicker is loaded
- **THEN** the kicker's computed `text-decoration-line` is `none`
