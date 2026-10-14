## ADDED Requirements

### Requirement: Error reports carry no request body

The server's Sentry setup SHALL NOT attach the body of an incoming request to an error report, whatever the route and the content type. A failed analysis, email or chat-plugin request SHALL reach Sentry without its quiz answers, email address or face-crop bytes, so nothing the pages promise to delete within 24 hours stays in Sentry for its 30 days. Request spans stay off, as Next.js records them itself.

#### Scenario: A request with a body fails

- **WHEN** a POST with a body raises an error that reaches Sentry
- **THEN** the error report holds no request body

#### Scenario: The server setup

- **WHEN** the server's Sentry options are built
- **THEN** incoming request bodies are not captured, and incoming request spans stay disabled
