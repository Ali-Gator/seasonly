## ADDED Requirements

### Requirement: Bots are refused on the report email route

The report email route SHALL check each request with Vercel BotID before anything else. A request classified as a bot SHALL be answered 403 and SHALL NOT read a report, store an address or send an email. The browser SHALL attach BotID's challenge to the email step's request.

**Unenforced:** as on the analyze route, BotID judges real traffic only on a Vercel deployment. The unit test proves the refusal; the preview check shows the challenge.

#### Scenario: A bot

- **WHEN** BotID classifies a report email request as a bot
- **THEN** the route answers 403, and nothing is stored or sent

#### Scenario: The browser protects the request

- **WHEN** the client instrumentation starts
- **THEN** BotID protects `POST` requests to the report email route for any report id

### Requirement: A report gets at most 3 emails

A report SHALL take at most 3 stored addresses, counted whatever they are, and each stored address SHALL get one email. A fourth request SHALL be answered 429, and SHALL store and send nothing. The count and the store SHALL be one database step, so two requests at once cannot both pass the limit. The email step SHALL then open the report without sending, since the report itself is the person's.

#### Scenario: The fourth address

- **WHEN** a fourth address is sent for a report that already has 3
- **THEN** the route answers 429, no address is stored, no email is sent, and the step opens the report

#### Scenario: Two requests at once

- **WHEN** two addresses are sent at the same moment for a report that has 2
- **THEN** exactly one is stored and emailed, and the other is answered 429
