## MODIFIED Requirements

### Requirement: A page is indexed only once its content ships

A route that may be indexed SHALL be marked ready only once the change that delivers its content is merged. Until then it SHALL be served with `noindex` and SHALL be left out of the sitemap, so thin pages are never crawled. Ready is set once per route, for all 12 season pages together.

#### Scenario: A stub page

- **WHEN** `/how-it-works` is live but not marked ready
- **THEN** it carries `noindex` and is absent from the sitemap

#### Scenario: A page marked ready

- **WHEN** a route is marked ready
- **THEN** it drops `noindex` and appears in the sitemap with no other code change
