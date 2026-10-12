## MODIFIED Requirements

### Requirement: Each funnel step fires one event

Each step from landing to share SHALL be recorded by exactly one PostHog event per time the person reaches it:

| Step             | Event                                                      | Fires when                                           |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Landing          | `$pageview` with a path other than `/analyze` and `/r/:id` | a site page is shown                                 |
| Flow start       | `$pageview` with path `/analyze`                           | the photo guide is shown                             |
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

#### Scenario: Back to a step already seen

- **WHEN** the person goes Back from the email step to the reveal and forward again with "Get my full report"
- **THEN** `report_requested` fires a second time, for the second tap, and `analysis_result` does not

#### Scenario: PostHog off

- **WHEN** the flow runs without a PostHog key
- **THEN** no request reaches PostHog and the person reaches the report as before

### Requirement: The funnel is saved in PostHog

The PostHog project SHALL hold a funnel insight "Landing to share" on the Seasonly dashboard. Its steps SHALL be those of "Each funnel step fires one event" from Landing to Shared or saved, with:

- Photo checked as any `photo_checked`, since a quiz-only result follows two failed checks;
- no Consent step, since the flow no longer has one;
- Result as an `analysis_result` with the outcome `result`;
- Shared or saved as one action: `share_tapped` with the outcome `shared`, `share_card_downloaded` or `palette_saved`.

It SHALL be filtered to the host `seasonly.me`, with test accounts filtered out. Premium interest and failed analyses are read beside it, not as steps.

**Unenforced:** the insight is a setting in the PostHog project, not app behavior; it is made and checked by hand through the PostHog connector, and its link is recorded in the change's tasks.

#### Scenario: Reading the funnel

- **WHEN** the dashboard is opened
- **THEN** "Landing to share" shows each step's conversion for production traffic only, with no Consent step

## REMOVED Requirements

### Requirement: The flow's new events carry only their outcome

**Reason**: `consent_answered` and its scenario "Declining consent" go with the consent step (`capture-flow`). A MODIFIED block cannot drop a scenario, so the requirement is restated without them.

**Migration**: Use "The flow's events carry only their outcome", below: the same rules for `quiz_completed`, `analysis_failed` and `report_requested`, and the same no-identify rule. Citations of `#requirement-the-flows-new-events-carry-only-their-outcome` move to `#requirement-the-flows-events-carry-only-their-outcome`. `#scenario-declining-consent` has no successor: its test drops the decline half.

## ADDED Requirements

### Requirement: The flow's events carry only their outcome

- `quiz_completed` SHALL carry `quiz_only`: true when no photo will be sent.
- `analysis_failed` SHALL fire when the analysis request fails or times out while the person is still waiting for it, and SHALL carry `quiz_only`. It SHALL NOT fire when the person leaves the analyzing step by Back.
- `report_requested` SHALL carry `quiz_only`.

None of them SHALL carry the answers, the image, the season's text or the report id.

#### Scenario: The analysis times out

- **WHEN** the analysis request gets no answer within the client's limit
- **THEN** one `analysis_failed` event is sent and the error step is shown

#### Scenario: Back while analyzing

- **WHEN** the person goes Back while the analysis is running
- **THEN** no `analysis_failed` event is sent

The app SHALL NOT identify a person to PostHog, nor set person properties, from an address, a report or anything else. Events stay with PostHog's anonymous id.

#### Scenario: After the email step

- **WHEN** a person gives an address and opens the report
- **THEN** no `$identify` or `$set` event is sent, and the following events keep the same anonymous id
