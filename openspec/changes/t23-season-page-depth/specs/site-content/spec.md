## ADDED Requirements

### Requirement: A season page shows the season's makeup and hair colors

Each season page SHALL show a "Makeup and hair" section after the metals and before the outfit ideas. It SHALL hold four groups, in this order: Lips, Blush, Eyes and Hair. Each group SHALL show that season's colors for it from the shared season palettes, with their names and hex codes, in the shared order. The section intro SHALL be the season's shared makeup line, and the Hair group SHALL open with the season's shared hair tip. A season page and a report for the same season therefore show the same makeup and hair colors and the same words for them.

#### Scenario: Makeup and hair match the report

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its "Makeup and hair" section lists exactly the lip, blush, eye and hair colors a Soft Autumn report lists, in the same order, with the same names and hex codes, under the Soft Autumn makeup line and with the Soft Autumn hair tip

#### Scenario: Every season shows its makeup and hair

- **WHEN** any of the 12 season pages is rendered
- **THEN** it shows the Lips, Blush, Eyes and Hair groups with that season's shared colors

### Requirement: A season page suggests three outfits from its own palette

Each season page SHALL show an "Outfit ideas" section after "Makeup and hair" and before the famous people. It SHALL hold three outfits, in this order: Everyday, Work and Evening. Each outfit SHALL be three colors, each with its name and hex code:

1. one of the season's 24 best colors, worn near the face;
2. one of the season's 6 best neutrals;
3. one of the season's metals to wear.

Every color SHALL be taken by name from that season's shared palette, so the page makes up no color and no hex code. No outfit color SHALL be one of the season's colors to avoid. The three outfits SHALL each use a different best color.

Under its colors, each outfit SHALL read as one sentence naming its three colors in lower case:

- Everyday: "A <best> top with <neutral> trousers and <metal> jewelry."
- Work: "A <best> blouse under a <neutral> jacket, with <metal> jewelry."
- Evening: "A <best> dress with <neutral> shoes and bag, and <metal> jewelry."

"A" becomes "An" before a color whose name starts with a vowel.

#### Scenario: Outfits use only the season's own colors

- **WHEN** any of the 12 season pages is rendered
- **THEN** it shows the Everyday, Work and Evening outfits, each with one of that season's best colors, one of its neutrals and one of its metals, with the palette's names and hex codes, none of them a color to avoid, and three different best colors

#### Scenario: An outfit reads as a sentence

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its Everyday outfit shows Sage, Oatmeal and Brushed Gold and reads "A sage top with oatmeal trousers and brushed gold jewelry."

#### Scenario: The new sections sit before the famous people

- **WHEN** any season page is rendered
- **THEN** "Makeup and hair" comes after "Best metals", "Outfit ideas" comes after "Makeup and hair", and the famous people come after "Outfit ideas"

### Requirement: A season page names more people from the same source

Under its three credited photos, each season page SHALL name three to six more public figures in one line: "The same studio also types <names> as <Season>s." Every name SHALL appear as that season in the same published color analysis the section already links as its source. These names SHALL have no photo. No name SHALL repeat one of the three figures with a photo, and no name SHALL appear twice. The note that these are readings of public photos and that no one shown endorses Seasonly SHALL come after this line, so it covers every name.

#### Scenario: The extra names

- **WHEN** any of the 12 season pages is rendered
- **THEN** after the three photos it names three to six more people, none of them one of the three with a photo and none twice, and the endorsement note comes after that line

#### Scenario: The extra names on Soft Autumn

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** it reads "The same studio also types Angelina Jolie, Gigi Hadid, Hailey Bieber, Kate Moss, Gisele Bündchen and Jessica Biel as Soft Autumns."
