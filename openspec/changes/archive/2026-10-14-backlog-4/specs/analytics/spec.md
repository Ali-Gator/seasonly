## MODIFIED Requirements

### Requirement: The flow's events carry only their outcome

- `quiz_completed` SHALL carry `quiz_only`: true when no photo will be sent.
- `analysis_failed` SHALL fire when the analysis request fails or times out while the person is still waiting for it, and SHALL carry `quiz_only` and `blocked`: true when the analyze route answered 403 (the bot check refused the browser), false for any other failure. It SHALL NOT fire when the person leaves the analyzing step by Back.
- `report_requested` SHALL carry `quiz_only`.

None of them SHALL carry the answers, the image, the season's text or the report id.

#### Scenario: The analysis times out

- **WHEN** the analysis request gets no answer within the client's limit
- **THEN** one `analysis_failed` event is sent and the error step is shown

#### Scenario: Back while analyzing

- **WHEN** the person goes Back while the analysis is running
- **THEN** no `analysis_failed` event is sent

#### Scenario: A refused browser

- **WHEN** the analyze route answers 403
- **THEN** one `analysis_failed` event is sent with `blocked: true`, and the blocked screen is shown

#### Scenario: A server error is not a refusal

- **WHEN** the analyze route answers 500
- **THEN** one `analysis_failed` event is sent with `blocked: false`
