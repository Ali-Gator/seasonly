## MODIFIED Requirements

### Requirement: The core pages are indexed

The six core routes (`/`, `/seasons`, `/seasons/<slug>`, `/how-it-works`, `/sample-report` and `/color-analysis-gpt-alternative`) SHALL be marked ready in the route map, so each carries no `noindex` and is listed in the sitemap ({@link openspec/specs/site-structure/spec.md#requirement-a-page-is-indexed-only-once-its-content-ships}).

#### Scenario: The core routes are ready

- **WHEN** the route map is read
- **THEN** the six core routes are marked ready, and the sitemap lists `/`, `/seasons`, the 12 season pages, `/how-it-works`, `/sample-report` and `/color-analysis-gpt-alternative`, besides `/color-analysis-quiz` (quiz-page), `/privacy` and `/terms`: 20 URLs
