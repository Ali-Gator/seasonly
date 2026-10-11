## ADDED Requirements

### Requirement: The privacy policy covers the chat plugin

`/privacy` SHALL have a section on the Seasonly plugin for ChatGPT and Claude. The section SHALL say that:

- the plugin receives only the four quiz answers the chat passes to it, and no photo, message text, name or account;
- the plugin stores nothing and sends no analytics event;
- Vercel's request logs and Sentry's error reports apply, as for the site;
- the chat provider (OpenAI for ChatGPT, Anthropic for Claude) handles the conversation under its own privacy policy, which the section links.

The section's text SHALL be approved by the user before it ships, and the page's "Last updated" date SHALL change with it.

#### Scenario: Reading the privacy plugin section

- **WHEN** a person reads `/privacy`
- **THEN** it says the plugin receives only the four quiz answers, stores nothing, and that OpenAI or Anthropic handles the conversation under its own policy, with links to both

### Requirement: The terms say which age rule covers the chat plugin

`/terms` SHALL say which minimum age applies to the Seasonly plugin in ChatGPT and Claude. OpenAI accepts only plugins that suit users aged 13 to 17. The plugin takes no photo, no personal detail and stores nothing, so the proposed rule is: the site's minimum age (16) applies to the photo analysis and the report, and the plugin follows the age rules of the chat app it runs in. The rule and its wording SHALL be approved by the user before they ship. The terms' "Last updated" date SHALL change with them.

#### Scenario: Reading the terms' plugin age rule

- **WHEN** a person reads `/terms`
- **THEN** it says which minimum age applies to the chat plugin, apart from the site's photo analysis and report
