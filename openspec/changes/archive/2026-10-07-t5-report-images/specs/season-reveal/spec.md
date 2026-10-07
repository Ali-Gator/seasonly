## MODIFIED Requirements

### Requirement: The route outlasts its slowest path

The analyze route's time limit SHALL be 60 s. Its slowest path is a 3 s slot claim, a 20 s model call and a 3 s save, before the response, then a 3 s crop upload after it. A failed save and a failed upload each wait up to 2 s more for Sentry to flush. That totals at most 33 s, so a slow model call falls back, and the upload gives up, before the platform stops the function.

#### Scenario: The declared limit

- **WHEN** the analyze route's configuration is read
- **THEN** its maximum duration is 60 s
