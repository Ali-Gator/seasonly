## MODIFIED Requirements

### Requirement: The GPT-alternative page documents the chat plugin

`/color-analysis-gpt-alternative` SHALL have a section "Use Seasonly in ChatGPT and Claude" with the copy of the approved "Color analysis GPT alternative" board, plus the publisher line approved by the user on 2026-10-30. Both plugin directories link to this section as the plugin's public documentation. The section SHALL say:

- what the plugin does: it asks the four quiz questions and gives the season family and 6 of its colors, with a link to the photo analysis for the exact subtype;
- who publishes it: Oleg Gordienov, an individual in Bulgaria;
- that it takes no photo;
- how to add it: the server address `https://seasonly.me/api/mcp` for a custom connector, and, once listed, a link to each directory listing;
- where its data handling is described, with a link to the plugin section of `/privacy`.

The section SHALL have an anchor that the listings can link to. It SHALL state only what the plugin does at the time it ships: it SHALL NOT link to a directory listing that is not yet published.

#### Scenario: Reading the plugin section

- **WHEN** `/color-analysis-gpt-alternative` is rendered
- **THEN** it has a section with an anchor, titled "Use Seasonly in ChatGPT and Claude", that names the server address `https://seasonly.me/api/mcp`, says no photo is taken and links to `/privacy`

#### Scenario: The plugin section names the publisher

- **WHEN** `/color-analysis-gpt-alternative` is rendered
- **THEN** the plugin section says the plugin is published by Oleg Gordienov, an individual in Bulgaria
