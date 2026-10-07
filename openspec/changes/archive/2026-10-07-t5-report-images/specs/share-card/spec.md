## Purpose

Gives every season a share card: a PNG image of the season name, its highlight colors and the site address, sized for a 9:16 story and a 1:1 post. People post it, so it carries the address and nothing personal.

## ADDED Requirements

### Requirement: Each season has a story card and a post card

For each of the 12 season slugs, `/images/share/<slug>/story` SHALL answer a 1080 × 1920 PNG and `/images/share/<slug>/post` a 1080 × 1080 PNG. Both SHALL be generated at build time, so a request never renders. Any other slug or ratio SHALL answer 404.

#### Scenario: Soft Autumn's story card

- **WHEN** `/images/share/soft-autumn/story` is requested
- **THEN** it answers 200 with `image/png`, and the image is 1080 pixels wide and 1920 high

#### Scenario: Every season and ratio

- **WHEN** the story and post card of each of the 12 slugs are rendered
- **THEN** each is a PNG, every story card is 1080 × 1920 and every post card 1080 × 1080

#### Scenario: An unknown season or ratio

- **WHEN** `/images/share/autumn/story` or `/images/share/soft-autumn/reel` is requested
- **THEN** it answers 404

### Requirement: A card shows the season, its highlights and the address, and nothing personal

A card SHALL show, from top to bottom:

- the kicker "My color season";
- the season's name, as the season pages write it ("Soft Autumn");
- its highlight colors: the first 5 on a story card as a list, all 6 on a post card in 3 columns and 2 rows, each as a chip of its exact color with its name and its uppercase hex code;
- the wordmark "Seasonly" and the address `seasonly.me`.

The ground SHALL be the `surface` token, and every text color SHALL come from the design tokens. The card SHALL show no face, no quiz answer, no confidence and no report id. Its layout SHALL follow the design system's ShareCard at 1080 pixels wide.

**Unenforced:** fidelity to the ShareCard layout is judged by the user, with the thumbnail check below.

#### Scenario: Soft Autumn's story card content

- **WHEN** Soft Autumn's story card is rendered
- **THEN** it holds "My color season", "Soft Autumn", Terracotta `#B4694F`, Deep Teal `#4C7774`, Camel `#C39D6F`, Dusty Rose `#C4918A` and Olive `#7B7848` in that order, each chip filled with its hex, then "Seasonly" and "seasonly.me"

#### Scenario: A post card shows six colors

- **WHEN** Soft Autumn's post card is rendered
- **THEN** it holds the same five colors followed by Mushroom `#A08F7E`, in two rows of three

### Requirement: A card's alt text names the season and its colors

Each card SHALL have an alt text: "My color season: <season name>. " followed by the names of the colors it shows, joined with ", " and ending with ".". A page that shows a card SHALL use it as the image's alt text.

#### Scenario: Soft Autumn's story card alt text

- **WHEN** the alt text of Soft Autumn's story card is read
- **THEN** it is "My color season: Soft Autumn. Terracotta, Deep Teal, Camel, Dusty Rose, Olive."

### Requirement: Cards stay readable as thumbnails

At about 120 pixels wide, the size of a feed or grid thumbnail, a card's season name, its colors and `seasonly.me` SHALL still read.

**Unenforced:** readability is a human judgment. The change's task list gates it on the user's approval of all 24 cards shown at 120 pixels wide.

#### Scenario: Cards at thumbnail size

- **WHEN** the 24 cards are shown to the user at 120 pixels wide
- **THEN** the user confirms that the season name, the colors and `seasonly.me` read on each
