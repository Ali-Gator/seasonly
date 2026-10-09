## MODIFIED Requirements

### Requirement: The public routes are fixed

The site SHALL serve exactly these public page routes, each with the rendering and indexing given here. Indexing is the most a route may have; a route still waiting for its content is served noindex, as the "Indexed only once its content ships" requirement says.

| Route                             | Page                                       | Rendering                                | May be indexed |
| --------------------------------- | ------------------------------------------ | ---------------------------------------- | -------------- |
| `/`                               | Landing                                    | Static                                   | Yes            |
| `/seasons`                        | The 12 seasons index                       | Static                                   | Yes            |
| `/seasons/<slug>`                 | One season page per slug                   | Static, 12 pages                         | Yes            |
| `/how-it-works`                   | How the analysis works                     | Static                                   | Yes            |
| `/sample-report`                  | A full sample report                       | Static                                   | Yes            |
| `/color-analysis-gpt-alternative` | For users of the retiring GPT              | Static                                   | Yes            |
| `/privacy`                        | Privacy policy                             | Static                                   | Yes            |
| `/terms`                          | Terms of use                               | Static                                   | Yes            |
| `/analyze`                        | The analysis flow, every step on one route | Static shell                             | Never          |
| `/r/<id>`                         | A personal report                          | On request; 404 for an id with no report | Never          |

Every other page path SHALL answer 404 and SHALL NOT be indexed; the season-name redirects, `/sitemap.xml`, `/robots.txt`, icons, the generated images under `/images/` and `/api/` are not page paths. Each flow step (guide, capture, photo check, consent, quiz, analyzing, reveal, email) SHALL render inside `/analyze` without changing the URL.

#### Scenario: Each public route answers

- **WHEN** any static route in the table is requested (for `/seasons/<slug>`, every slug)
- **THEN** it answers 200

#### Scenario: A report id with no report

- **WHEN** `/r/<id>` is requested for an id that has no report
- **THEN** it answers 404 and the page carries `noindex`

#### Scenario: A stored report

- **WHEN** `/r/<id>` is requested for an id that has a report
- **THEN** it answers 200 and the page carries `noindex`

#### Scenario: An unknown path

- **WHEN** a path outside the table is requested, such as `/pricing`
- **THEN** it answers 404 and the page carries `noindex`

#### Scenario: Every page file is a mapped route

- **WHEN** a `page.tsx` under `apps/web/src/app` serves a path that is not in the table
- **THEN** the unit suite fails, naming the file
