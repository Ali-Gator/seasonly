## Purpose

Gives the web app the Seasonly design system's tokens and type styles as CSS variables and classes, under the same names the approved MVP canvas uses, so artboard markup ports into pages without renaming and the app cannot drift from the design system unnoticed.

## ADDED Requirements

### Requirement: The web app defines every design-system token as a CSS variable

The repo SHALL keep a copy of the design system's `tokens.json` at `apps/web/src/styles/tokens.json`. `apps/web/src/app/globals.css` SHALL define on `:root` one CSS variable per token in that copy, named `--<token name>` with the token's value: every color, spacing, radius, shadow and size token. `--font-serif` and `--font-sans` SHALL end with the font stacks `tokens.json` gives for the serif and sans families; what comes before that is the self-hosted font, as the fonts requirement says. Tokens whose name starts with `sample-` are demo data, not UI chrome, and SHALL NOT be defined.

#### Scenario: A token is missing or drifted

- **WHEN** a token in `tokens.json` (other than a `sample-` token) has no matching `:root` variable in `globals.css`, or the values differ (for the two font variables: the value does not end with the `tokens.json` stack)
- **THEN** the unit suite fails, naming the token

#### Scenario: A demo color is defined as a variable

- **WHEN** `globals.css` defines a `--sample-` variable
- **THEN** the unit suite fails, naming it

### Requirement: The type styles are classes with the design-system values

`globals.css` SHALL define the classes `.display`, `.h1`, `.h2`, `.h3`, `.quote`, `.lead`, `.body`, `.label`, `.caption`, `.hex` and `.overline`, each with the font family, size, line height, weight, letter spacing, style and optical size its type style has in `tokens.json`.

#### Scenario: A type style differs from tokens.json

- **WHEN** a class's font size, line height or weight differs from its type style in `tokens.json`
- **THEN** the unit suite fails, naming the class and the property

### Requirement: Fonts are self-hosted and the page uses paper and ink

Bodoni Moda (with its optical-size axis) and Instrument Sans SHALL be loaded with `next/font`, so they are served from the site's own origin, and `--font-serif` and `--font-sans` SHALL resolve to them before their fallbacks. The `<body>` SHALL use `--paper` as its background and `--ink` as its text color.

#### Scenario: A page loads

- **WHEN** any public page is loaded
- **THEN** no request goes to `fonts.googleapis.com` or `fonts.gstatic.com`, and the body's computed background is `#f7f7f7` and its text color `#1a1a1a`
