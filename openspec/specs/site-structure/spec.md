# site-structure Specification

## Purpose

Fixes the public URL map of seasonly.me — which routes exist, how they render, which ones search engines may index, and the canonical URL, sitemap and robots rules that follow from it — so pages added later slot into a structure that never has to move.

## Public Interface

```typescript
// apps/web/src/lib/site/routes.ts
export const ORIGIN = "https://seasonly.me";
export const SEASONS: readonly { slug: SeasonSlug; summary: string }[]; // family order
export type SeasonSlug; // the 12 fixed slugs, from @seasonly/analysis
export const SEASON_SLUGS: readonly SeasonSlug[]; // @seasonly/analysis's list (season-palettes)
export const SEASON_ALIASES: Readonly<Record<string, SeasonSlug>>; // alternative name -> slug
export function seasonName(slug: SeasonSlug): string; // "soft-autumn" -> "Soft Autumn"

export interface Route {
  path: string; // "/seasons/[season]" and "/r/[id]" are patterns
  title: string; // the season entry fills {season} and {summary} per slug
  description: string;
  indexable: boolean; // may ever be indexed
  ready: boolean; // its content has shipped
}
export const ROUTES: readonly Route[];
export function routeAt(path: string, routes?: readonly Route[]): Route | undefined;
export function pages(routes?: readonly Route[]): Route[]; // concrete pages, seasons expanded
export function indexedUrls(routes?: readonly Route[]): string[]; // the sitemap
export function pageMetadata(path: string, routes?: readonly Route[]): Metadata;
```

`apps/web/src/app/sitemap.ts` and `robots.ts` are Next metadata routes over this module. `next.config.ts` builds its `redirects()` from `SEASON_ALIASES`.

## Behavior

A page exports `metadata = pageMetadata("/its-path")`, or a `generateMetadata` that calls it with the concrete path. Adding a page means adding one `ROUTES` entry and its `page.tsx`; the unit suite fails until both exist. Shipping a page's content means flipping its `ready` in the same change; nothing else moves. The season pages share one entry, so one flag covers all 12.

Pages live in two route groups: `(site)` carries the shared header and footer, `(flow)` (`/analyze`, `/r/[id]`) a header bar with only the wordmark. The root `not-found.tsx` gives unmatched URLs the site chrome; `(flow)/not-found.tsx` serves an unknown report inside the flow layout.

## Edge Cases

- A slug outside the 12, or the right slug wrongly cased: 404 at routing (`dynamicParams = false`). Locally, `next start` on a case-insensitive disk (macOS) serves a wrongly cased slug as 200; Linux CI and Vercel answer 404.
- An alias in any letter case (`/seasons/Clear-Winter`): 308, since Next matches redirects case-insensitively.
- `/r/<id>` with an encoded `/` or space: `generateMetadata` re-encodes the id, so it maps to the report route and never throws.
- A `(site)` page that calls `notFound()` renders the root 404 inside the `(site)` layout, doubling the chrome; let unknown params 404 at routing instead.
- `pageMetadata` on a path no route serves throws, so a page wired to the wrong path fails the build.

## Requirements

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

#### Scenario: An unknown path

- **WHEN** a path outside the table is requested, such as `/pricing`
- **THEN** it answers 404 and the page carries `noindex`

#### Scenario: Every page file is a mapped route

- **WHEN** a `page.tsx` under `apps/web/src/app` serves a path that is not in the table
- **THEN** the unit suite fails, naming the file

### Requirement: The 12 season slugs are fixed

The season routes SHALL use exactly these 12 slugs: `light-spring`, `true-spring`, `bright-spring`, `light-summer`, `true-summer`, `soft-summer`, `soft-autumn`, `true-autumn`, `deep-autumn`, `deep-winter`, `true-winter`, `bright-winter`. A slug outside this list SHALL answer 404 and SHALL NOT be generated on request.

#### Scenario: A known slug

- **WHEN** `/seasons/soft-autumn` is requested
- **THEN** the Soft Autumn page answers 200

#### Scenario: An unknown or wrongly cased slug

- **WHEN** `/seasons/autumn` or `/seasons/Soft-Autumn` is requested
- **THEN** it answers 404

### Requirement: Alternative season names redirect to the fixed slug

Each common alternative season name SHALL permanently redirect (308) to its fixed slug: `warm-spring` → `true-spring`, `clear-spring` → `bright-spring`, `cool-summer` → `true-summer`, `warm-autumn` → `true-autumn`, `cool-winter` → `true-winter`, `clear-winter` → `bright-winter`.

#### Scenario: An alternative name

- **WHEN** `/seasons/clear-winter` is requested
- **THEN** the response is a 308 redirect to `/seasons/bright-winter`

### Requirement: Every page states one canonical URL on the apex host

Every page that may be indexed SHALL carry a canonical link to its own path on `https://seasonly.me`, with no trailing slash, query or fragment, whatever host or deployment served it. Every page SHALL carry a title and a meta description, and no two indexable pages SHALL share a title.

#### Scenario: A page served from another host

- **WHEN** `/seasons/soft-autumn` is served from `seasonly-six.vercel.app` or a preview deployment
- **THEN** its canonical link is `https://seasonly.me/seasons/soft-autumn`

#### Scenario: A page requested with a query

- **WHEN** `/how-it-works?utm_source=tiktok` is requested
- **THEN** its canonical link is `https://seasonly.me/how-it-works`

#### Scenario: Two indexable pages with the same title

- **WHEN** two indexable routes resolve to the same title
- **THEN** the unit suite fails, naming both routes

### Requirement: Flow and report pages are never indexed

`/analyze` and every `/r/<id>` page SHALL carry `noindex`, SHALL NOT appear in the sitemap, and SHALL NOT be blocked in `robots.txt`, so crawlers can read the `noindex`.

#### Scenario: A report page

- **WHEN** a crawler fetches `/r/<id>`
- **THEN** the page carries `noindex` and the path is in neither the sitemap nor a `robots.txt` disallow rule

#### Scenario: The flow page

- **WHEN** `/analyze` is fetched
- **THEN** the page carries `noindex`

### Requirement: A page is indexed only once its content ships

A route that may be indexed SHALL be marked ready only once the change that delivers its content is merged. Until then it SHALL be served with `noindex` and SHALL be left out of the sitemap, so thin pages are never crawled. Ready is set once per route, for all 12 season pages together.

#### Scenario: A stub page

- **WHEN** `/terms` is live but not marked ready
- **THEN** it carries `noindex` and is absent from the sitemap

#### Scenario: A page marked ready

- **WHEN** a route is marked ready
- **THEN** it drops `noindex` and appears in the sitemap with no other code change

### Requirement: The sitemap lists exactly the indexed pages

`/sitemap.xml` SHALL list the absolute `https://seasonly.me` URL of every route that is marked ready, expanding `/seasons/<slug>` to all 12 slugs, and SHALL list nothing else.

#### Scenario: Sitemap contents

- **WHEN** the sitemap is generated
- **THEN** it holds one entry per ready route, all 12 season URLs when the season pages are ready, and no `/analyze`, `/r/`, `/api/` or redirecting URL

### Requirement: robots.txt allows the site and blocks the API

`/robots.txt` SHALL allow all crawlers on all pages, disallow `/api/`, and name `https://seasonly.me/sitemap.xml` as the sitemap.

#### Scenario: robots.txt contents

- **WHEN** `/robots.txt` is requested
- **THEN** it allows `/`, disallows `/api/` and names the apex sitemap URL
