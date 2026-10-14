## MODIFIED Requirements

### Requirement: A photo that passes can be sampled

When the check reports no problem, color sampling of the same pixels and landmarks SHALL return traits, and the check's result SHALL carry those traits, so the caller does not sample the photo again. A result that reports a problem SHALL carry no traits. The result's type SHALL make both rules hold at compile time: a result with no problem and no traits, or with a problem and traits, SHALL NOT typecheck, so a stand-in check (the eval's) cannot pass a photo without traits.

#### Scenario: Sampling a passed photo

- **WHEN** a photo passes the check
- **THEN** color sampling of the same input returns traits, not none

#### Scenario: A passed photo carries its traits

- **WHEN** a photo passes the check
- **THEN** the result's traits equal the traits color sampling returns for the same input

#### Scenario: A rejected photo carries no traits

- **WHEN** a photo is rejected as `dark`
- **THEN** the result carries no traits

#### Scenario: The type refuses a pass without traits

- **WHEN** a result is written with no problem and no traits, or with a problem and traits
- **THEN** it does not typecheck
