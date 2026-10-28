## MODIFIED Requirements

### Requirement: Alternative season names redirect to the fixed slug

Each common alternative season name SHALL permanently redirect (308) to its fixed slug: `warm-spring` → `true-spring`, `clear-spring` → `bright-spring`, `cool-summer` → `true-summer`, `warm-autumn` → `true-autumn`, `dark-autumn` → `deep-autumn`, `dark-winter` → `deep-winter`, `cool-winter` → `true-winter`, `clear-winter` → `bright-winter`. Each season's second name (the "A season's second name leads its title and description" requirement) SHALL have exactly one of these redirects, and no redirect SHALL exist without a second name.

#### Scenario: An alternative name

- **WHEN** `/seasons/clear-winter` is requested
- **THEN** the response is a 308 redirect to `/seasons/bright-winter`

#### Scenario: A dark name

- **WHEN** `/seasons/dark-autumn` is requested
- **THEN** the response is a 308 redirect to `/seasons/deep-autumn`

## ADDED Requirements

### Requirement: A season's second name leads its title and description

Eight seasons SHALL carry a second name, the one searchers also use: Dark for Deep Autumn and Deep Winter, Warm for True Spring and True Autumn, Cool for True Summer and True Winter, and Clear for Bright Spring and Bright Winter. Light Spring, Light Summer, Soft Summer and Soft Autumn SHALL have none.

The page title and the meta description of a season with a second name SHALL name it as "<first word> (<second name>) <family>", for example "Deep (Dark) Autumn color palette and colors to avoid · Seasonly". A season without a second name SHALL keep its one name there.

#### Scenario: A season with a second name

- **WHEN** the metadata of `/seasons/deep-autumn` is built
- **THEN** its title is "Deep (Dark) Autumn color palette and colors to avoid · Seasonly", and its description names "Deep (Dark) Autumn"

#### Scenario: A season without one

- **WHEN** the metadata of `/seasons/soft-autumn` is built
- **THEN** its title is "Soft Autumn color palette and colors to avoid · Seasonly"
