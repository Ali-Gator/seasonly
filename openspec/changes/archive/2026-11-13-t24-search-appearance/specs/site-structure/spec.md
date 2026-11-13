## ADDED Requirements

### Requirement: Every indexed page carries link-preview tags

Every page that may be indexed SHALL carry Open Graph tags for its title, description, URL, site name, type and one image, and a Twitter card of type `summary` with the same title, description and image. The title and description SHALL equal the page's own title and meta description, and the URL its canonical link. The site name SHALL be "Seasonly" and the type "website". A page that is never indexed, such as the flow or a report, SHALL carry none of these tags.

#### Scenario: A season page's preview text

- **WHEN** the metadata of `/seasons/true-summer` is built
- **THEN** its Open Graph title is "True (Cool) Summer color palette and colors to avoid · Seasonly", its Open Graph description equals its meta description, its Open Graph URL is `https://seasonly.me/seasons/true-summer`, its site name is "Seasonly", and its Twitter card is `summary` with the same title and description

#### Scenario: Every indexed page

- **WHEN** the metadata of each URL in the sitemap is built
- **THEN** each has an Open Graph title, description, URL and image, and the URL equals that page's canonical link

#### Scenario: A report

- **WHEN** the metadata of `/r/abc123` or `/analyze` is built
- **THEN** it has no Open Graph and no Twitter tags

### Requirement: A link preview shows a season's share card

The preview image of a season page SHALL be that season's post card, `/images/share/<slug>/post`. The preview image of every other indexed page SHALL be Soft Autumn's post card, the season of the sample result. The image URL SHALL be absolute on `https://seasonly.me`, and the tags SHALL state its size, 1080 × 1080, and the card's own alt text.

#### Scenario: A season page's preview image

- **WHEN** the metadata of `/seasons/true-summer` is built
- **THEN** its Open Graph image and its Twitter image are `https://seasonly.me/images/share/true-summer/post`, 1080 wide and 1080 high, with the True Summer post card's alt text

#### Scenario: Another page's preview image

- **WHEN** the metadata of `/`, `/seasons` or `/how-it-works` is built
- **THEN** its Open Graph image is `https://seasonly.me/images/share/soft-autumn/post`

### Requirement: The home page names the site for search engines

The home page SHALL carry one schema.org `WebSite` block as JSON-LD, naming the site "Seasonly" with the URL `https://seasonly.me`, so a search result is labeled with the site's name and not its domain. No other page SHALL carry a `WebSite` block.

#### Scenario: The home page

- **WHEN** `/` is rendered
- **THEN** its HTML holds exactly one `application/ld+json` script, and its JSON has `@context` "https://schema.org", `@type` "WebSite", `name` "Seasonly" and `url` "https://seasonly.me"

#### Scenario: Another page

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its HTML holds no `WebSite` block
