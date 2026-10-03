## ADDED Requirements

### Requirement: Bots are refused on the analyze route

The analyze route SHALL check each request with Vercel BotID before anything else. A request classified as a bot SHALL be answered 403 and SHALL NOT claim a slot, call the model or store anything. The browser SHALL attach BotID's challenge to `POST /api/analyze`.

**Unenforced:** BotID classifies real traffic only on a Vercel deployment. Off Vercel it answers "human" by default (its documented local behavior, checked under `next start` in task 3.3), so local runs and CI's E2E pass through. The unit test proves the refusal with a bot answer, and a preview deployment shows the challenge on the request.

#### Scenario: A bot

- **WHEN** BotID classifies an analyze request as a bot
- **THEN** the route answers 403, and no slot is claimed, no model call is made and nothing is stored

#### Scenario: The browser protects the request

- **WHEN** the client instrumentation starts
- **THEN** BotID protects `POST /api/analyze`
