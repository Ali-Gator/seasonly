## MODIFIED Requirements

### Requirement: Each funnel step fires one event

Each step from landing to share SHALL be recorded by exactly one PostHog event per time the person reaches it:

| Step             | Event                                                      | Fires when                                           |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Landing          | `$pageview` with a path other than `/analyze` and `/r/:id` | a site page is shown                                 |
| Flow start       | `$pageview` with path `/analyze`                           | the flow opens, on the guide or on the camera        |
| Photo checked    | `photo_checked`                                            | as `capture-flow` requires                           |
| Quiz done        | `quiz_completed`                                           | the person leaves the last question with an answer   |
| Result           | `analysis_result`, `quiz_no_result` or `analysis_failed`   | as `season-reveal` requires; `analysis_failed` below |
| Report asked for | `report_requested`                                         | the person chooses "Get my full report"              |
| Email given      | `email_submitted`                                          | the address is stored and the report opens           |
| Report opened    | `$pageview` with path `/r/:id`                             | a report page is shown                               |
| Shared or saved  | `share_tapped`, `share_card_downloaded`, `palette_saved`   | below                                                |
| Premium interest | `premium_tapped`                                           | interest is recorded                                 |

An event SHALL fire from the person's action or from the outcome it reports, never from a render: showing a step again, or rendering it twice, SHALL NOT fire it again. With PostHog off, no event SHALL be sent and every step SHALL work the same. The flow has no consent step, so no `consent_answered` event SHALL be sent.

#### Scenario: From landing to the report

- **WHEN** a person opens the landing page, starts the flow, uploads a photo that passes, answers the quiz, gets a result, chooses "Get my full report" and gives an address
- **THEN** PostHog receives, in order, `$pageview` (`/`), `$pageview` (`/analyze`), `photo_checked`, `quiz_completed`, `analysis_result`, `report_requested`, `email_submitted` and `$pageview` (`/r/:id`), each once, and no `consent_answered`

#### Scenario: Starting on the camera

- **WHEN** a person taps "Take a selfie" on the landing and the flow opens on the camera
- **THEN** PostHog receives `$pageview` (`/analyze`) exactly once, and removing the `start` parameter from the address sends no second one

#### Scenario: Back to a step already seen

- **WHEN** the person goes Back from the email step to the reveal and forward again with "Get my full report"
- **THEN** `report_requested` fires a second time, for the second tap, and `analysis_result` does not

#### Scenario: PostHog off

- **WHEN** the flow runs without a PostHog key
- **THEN** no request reaches PostHog and the person reaches the report as before
