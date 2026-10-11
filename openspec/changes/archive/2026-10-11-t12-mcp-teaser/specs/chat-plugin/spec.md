## Purpose

Brings Seasonly into ChatGPT and Claude as an MCP server with one tool. The tool takes the four quiz answers and returns the season family, its 6 highlight colors and a link to the photo analysis on seasonly.me. It gives the same season as the web quiz for the same answers, takes no photo and stores nothing.

## ADDED Requirements

### Requirement: The MCP endpoint is public and lists one tool

`/api/mcp` SHALL serve the Model Context Protocol over Streamable HTTP and SHALL answer requests that carry no credentials. Listing the tools SHALL return exactly one tool, the season quiz tool. Its name SHALL be at most 64 characters, and it SHALL have a human-readable title.

#### Scenario: Listing the tools without credentials

- **WHEN** a client with no credentials initializes a session at `/api/mcp` and lists the tools
- **THEN** exactly one tool is listed, with a name of at most 64 characters and a title

### Requirement: The tool is annotated read-only

The tool SHALL carry the annotations `readOnlyHint: true`, `destructiveHint: false` and `openWorldHint: false`, each set explicitly. Its description SHALL say what the tool does and what each of the four answers means. The description SHALL NOT tell the model how to behave, SHALL NOT tell it to call other tools, and SHALL NOT promote Seasonly or any other product.

**Unenforced:** whether a description instructs the model or promotes a product is a semantic judgment. The phase review checks it, and so do both stores' reviews.

#### Scenario: The annotations

- **WHEN** the tools are listed
- **THEN** the tool's annotations are `readOnlyHint: true`, `destructiveHint: false` and `openWorldHint: false`

### Requirement: The tool takes the four quiz answers and nothing else

The tool's input SHALL be the four quiz questions, `veins`, `jewelry`, `sun` and `hair`. Each is optional, and each takes the values the analysis core accepts ({@link openspec/specs/season-classifier/spec.md#requirement-quiz-answers-from-a-client-are-validated}). A missing question SHALL count as `unsure`. The tool SHALL take no photo, image, free text or personal detail. A call with an unknown field or an unknown value SHALL be refused with an error that names the field. It SHALL NOT be answered with a season.

#### Scenario: An unknown value

- **WHEN** the tool is called with `{ "veins": "purple" }`
- **THEN** the call is refused with an error naming `veins`, and no season is returned

#### Scenario: An unknown field

- **WHEN** the tool is called with a `photo` field
- **THEN** the call is refused with an error naming `photo`

### Requirement: The tool gives the web quiz's season

For the same answers, the tool's season SHALL be the one the analysis core's quiz-only classification gives, which the web flow also uses. The result SHALL hold:

- the season family's name;
- the season's tagline and reveal line from the core's season copy;
- the season's 6 highlight colors, in palette order, each with its name and hex code;
- a note that the result comes from the quiz alone, and that a selfie on seasonly.me gives the exact subtype and the full 30 colors;
- a link to `https://seasonly.me/analyze` carrying `utm_source=chat-plugin`.

The subtype's name and slug SHALL NOT appear in the result, in its text, in its structured content or on the card, as on the web reveal ({@link openspec/specs/season-reveal/spec.md#requirement-the-reveal-shows-the-season-family}). The same answers SHALL give the same result on every call.

#### Scenario: Parity with the web quiz

- **WHEN** the tool is called with any combination of answers that the core's quiz-only classification resolves to a season
- **THEN** the result names that season's family and lists that season's 6 highlight colors with names and hex codes, its tagline and its reveal line

#### Scenario: The subtype stays hidden

- **WHEN** the tool returns a result for a season whose name is "True Autumn" (the quiz alone never gives the Soft seasons or Bright Spring)
- **THEN** neither "True Autumn" nor `true-autumn` appears anywhere in the result, and "Autumn" does

#### Scenario: The link

- **WHEN** the tool returns a result
- **THEN** it links to `https://seasonly.me/analyze` with `utm_source=chat-plugin`

### Requirement: Answers with nothing to classify get an answer, not an error

When the answers give no season (`no-answers`: every answer `unsure`, neutral or missing; `answers-cancel`: answers that cancel out on every trait), the tool SHALL return a normal result, not an error. The result SHALL say which of the two happened, SHALL suggest answering the questions differently, and SHALL link to the photo analysis. It SHALL name no season and show no colors.

#### Scenario: Every answer unsure

- **WHEN** the tool is called with all four answers `unsure`
- **THEN** it returns a non-error result that says the answers point to no season, names no season and links to the photo analysis

#### Scenario: Answers that cancel out

- **WHEN** the tool is called with answers that the core classifies as `answers-cancel` (green veins with silver jewelry)
- **THEN** it returns a non-error result that says the answers point in opposite directions, names no season and links to the photo analysis

### Requirement: The result is an inline card, with text for hosts without one

The tool SHALL declare an MCP Apps UI resource (`ui://`, `text/html;profile=mcp-app`), so a host that supports it shows the result as an inline card. The card SHALL show the content of the approved canvas board "Chat card":

- the family's name;
- the tagline;
- the 6 swatches, each with its name and hex code as text, so color is never the only cue;
- the quiz-alone note;
- one action, which opens the link in the browser.

The card SHALL use the host's system font and text colors and SHALL show no logo; the swatches are its only strong color. It SHALL load nothing from the network, so its content security policy allows no outside origin. The tool's text content SHALL carry the same facts, so a host without UI shows a complete result.

#### Scenario: The card renders a result

- **WHEN** the card receives a result for a season
- **THEN** it shows the family name, the tagline, 6 swatches each labelled with a name and a hex code, the quiz-alone note and one action that opens the result's link

#### Scenario: A host without UI

- **WHEN** a host that does not render UI resources calls the tool
- **THEN** the text content names the family, the tagline, the 6 colors with names and hex codes, the quiz-alone note and the link

#### Scenario: No outside origin

- **WHEN** the UI resource is read
- **THEN** its content security policy lists no connect or resource domain

### Requirement: The plugin stores nothing and tracks no one

A tool call SHALL write nothing to the database or to storage. It SHALL set no cookie and SHALL send no analytics event. It SHALL make no outbound request. The answers SHALL NOT be logged. An unhandled error SHALL reach Sentry as on every route ({@link openspec/specs/observability/spec.md#requirement-every-route-handler-reports-its-unhandled-errors}).

#### Scenario: A tool call makes no outbound request

- **WHEN** the tool is called with any valid answers
- **THEN** no network request leaves the server, and the response sets no cookie

### Requirement: The tool works from ChatGPT and Claude

The production endpoint `https://seasonly.me/api/mcp` SHALL work in Claude as a custom connector and in ChatGPT in developer mode: the tool is offered, called with the answers given in the chat, and its card or text is shown.

**Unenforced:** each host's client runs only inside that host. The check is a manual run in each, recorded with its date in the change's tasks.

#### Scenario: A run in each host

- **WHEN** a person in Claude, and then in ChatGPT, answers the four questions in a chat with the plugin added
- **THEN** the tool is called with those answers and the chat shows the season family, the 6 colors and the link
