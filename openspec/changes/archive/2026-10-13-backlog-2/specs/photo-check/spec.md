## MODIFIED Requirements

### Requirement: A photo that passes can be sampled

When the check reports no problem, color sampling of the same pixels and landmarks SHALL return traits, and the check's result SHALL carry those traits, so the caller does not sample the photo again. A result that reports a problem SHALL carry no traits.

#### Scenario: Sampling a passed photo

- **WHEN** a photo passes the check
- **THEN** color sampling of the same input returns traits, not none

#### Scenario: A passed photo carries its traits

- **WHEN** a photo passes the check
- **THEN** the result's traits equal the traits color sampling returns for the same input

#### Scenario: A rejected photo carries no traits

- **WHEN** a photo is rejected as `dark`
- **THEN** the result carries no traits
