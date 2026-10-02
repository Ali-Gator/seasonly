## Context

`apps/web` has one placeholder page (`src/app/page.tsx`) and a root layout with a static title. The approved MVP canvas has 22 artboards, all flow or report screens. The landing's header and footer link to in-page anchors (`#how`, `#privacy`, `#terms`), and the consent screen links to a privacy policy that has no design. The report footer already shows the URL shape `seasonly.me/r/k7m2qx`. `globals.css` only imports Tailwind and the root layout paints `bg-white text-neutral-900`: no design-system token exists in code yet. The design system publishes `tokens.json` but no `tokens.css`, so the canvas mirrors the tokens in its own `base.css`, which only the canvas reads.

Vercel serves the apex `seasonly.me` as primary. `www` 308-redirects to it. `seasonly-six.vercel.app` also serves production, with no redirect. Previews sit behind Vercel SSO.

Motivation: see proposal.md, under Why.

## Goals / Non-Goals

**Goals:**

- One source of truth for routes. The sitemap, page metadata and the "every page is mapped" test all read it, so adding a page means adding one entry.
- Every public route exists from the first code commit, as a stub if need be. Later changes fill pages instead of choosing URLs.
- The design gate comes before code: the canvas gets the missing pages and the user approves them.

**Non-Goals:**

- Page copy and keywords (T9), JSON-LD, per-season OG images, a Lighthouse CI budget.
- Localized routes. The concept puts these in v2; when they come they get a prefix such as `/tr/...` and no existing URL changes.
- Season family pages (`/seasons/autumn`). The index page links all 12 seasons; a family page can be added later without moving anything.

## Decisions

### 1. Season slug naming: "true / bright" over "warm / clear"

The slugs use the names TikTok and most consumer content use (`true-autumn`, `bright-winter`). The alternatives from the Caygill and "tone" systems (`warm-autumn`, `clear-winter`, `cool-summer`) 308-redirect to them. That way both search phrasings land on one URL and no link splits.

- Alternative: `warm/cool/clear` as the canonical slugs. Rejected for now: the TikTok naming has wider consumer reach. The canvas shows only Soft Autumn, which is the same in both systems, so it settles nothing.
- This is the one decision in the change that cannot be cheaply reversed. You confirmed it on 2026-10-02.
- `season-palettes` (created by `t4-analysis-core`) will use these slugs as its season ids. That way a report, a share link and a season page agree with no mapping table between them.

### 2. One route map module

`apps/web/src/lib/site/routes.ts` exports the canonical origin (`https://seasonly.me`, a constant: the value never changes per environment, so it gets no env var), the route list (`path`, `title`, `description`, `indexable`, `ready`; the season entry builds its title and description per slug, so the 12 pages stay distinct) and the season slugs and aliases. The metadata helper `pageMetadata(path)` returns Next `Metadata`: title, description, `alternates.canonical`, and `robots: { index: false }` unless `indexable && ready`. `sitemap.ts` maps the ready entries. `robots.ts` is static. `next.config.ts` builds its `redirects()` from the alias map, which keeps the redirect a 308 at the edge without a page render.

- Alternative: metadata written inline per page. Rejected: canonical, robots and the sitemap would drift apart.
- Alternative: a route-matching middleware for aliases. Rejected: `redirects()` in config does the same with no runtime code.

### 3. Canonical as the duplicate-host fix

The canonical tag always names the apex, which covers `seasonly-six.vercel.app` and `www`. No host-based `noindex` and no `VERCEL_ENV` branching. Previews are already private behind SSO.

- Alternative: redirect `*.vercel.app` to the apex in middleware. Rejected for now: one more runtime path for a host nobody links to. Add it if Search Console reports the vercel.app host as indexed.

### 4. Stubs are noindex until ready

Each route ships now as a minimal page (the h1 plus one line in the approved layout) with `ready: false`. The change that delivers a page's content flips `ready` in the same PR. Ready is per route, so all 12 season pages go live in search together.

### 5. The flow is one route

`/analyze` keeps every step in client state. The photo never needs to survive a navigation, refresh restarts the flow, and analytics events mark the steps (the `t5-funnel-analytics` capability). There are no per-step URLs to guard against direct entry.

- Back button (for `t5-analysis-flow`): with one URL, the browser's Back would leave `/analyze` and lose the flow. Each step therefore pushes a history entry with `history.pushState` (same URL, the step in `state`) and listens for `popstate`, so Back returns to the previous step. The URL never changes, so nothing becomes deep-linkable.

### 6. Shared chrome

Two route groups split the chrome. `(site)/layout.tsx` carries the shared header (wordmark → `/`, Seasons, How it works) and footer (all 12 season links, the GPT-alternative page, Privacy, Terms); the footer gives every page a crawl path to each season page. `(flow)/layout.tsx` holds `/analyze` and `/r/<id>` with no footer and no nav, so the flow keeps its focus. Its header is one bar with the wordmark linking to `/` and nothing else: it keeps the brand in view while people hand over a photo of their face, and gives them a way out other than Back. The report screens add their own controls (Share) beside it; the step progress bar sits below it, inside the page. The root layout keeps only `<html>`, fonts and Speed Insights. The exact chrome comes from the approved artboards.

### 7. Artboards to add to the MVP canvas

Phone 375 for all of them. Desktop 1280 also for the seasons index and the season page, since search traffic is mostly desktop. The sample person and the DS components stay the same as the approved canvas.

- Shared header and footer (phone and desktop), and the landing updated to use them, with a "Explore the 12 seasons" block
- `/seasons` index
- `/seasons/soft-autumn` as the season page template: description, sample palette, colors to avoid, celebrities placeholder, CTA to `/analyze`
- `/how-it-works`
- `/sample-report`: the approved report with a "Sample" marker and a CTA
- `/color-analysis-gpt-alternative`
- `/privacy` and `/terms` as one legal-text template
- 404

### 8. Design tokens: one `:root` block, named as on the canvas

`globals.css` defines the tokens as plain `:root` variables with the canvas `base.css` names (`--paper`, `--ink-muted`, `--space-4`, `--size-tap`), plus its type classes (`.h1`, `.caption`, `.overline` and the rest). Artboard markup such as `style="gap: var(--space-4)"` then ports without renaming. A copy of the design system's `tokens.json` sits at `apps/web/src/styles/tokens.json`; a unit test parses `globals.css` and fails on any missing or drifted token or type style. Updating the design system means replacing that file, and the test lists what to change.

- `sample-*` tokens stay out: `tokens.json` marks them as demo data, never chrome.
- Fonts come from `next/font/google`, which self-hosts them, so no visitor request goes to Google. Bodoni Moda needs its `opsz` axis for the type styles' optical sizes; confirm `next/font` exposes it (`axes: ["opsz"]`) before relying on it.
- The root layout swaps `bg-white text-neutral-900` for paper and ink.
- Tailwind stays for layout utilities. No `@theme` mapping of the tokens until a page needs a token as a utility class.
- No README mapping row: `*.css` and `*.json` are spec-exempt, so, like `env`, the capability is enforced by its tests.
- Alternative: generate `globals.css` from `tokens.json` in a script. Rejected: one more build step for a file that changes rarely; the test catches drift just as well.
- Out of scope: porting the design system's components (`bundle.css`). Each page change ports the components it uses.

## Risks / Trade-offs

- [Wrong slug naming locked in] → Confirmed before code. After launch, aliases can still absorb a rename with a 308.
- [Stubs live in production look unfinished] → Each stub is a real page in the approved layout, and none is indexed or linked from the sitemap.
- [The design gate delays code past T5's start] → T5 changes can start on `/analyze` in parallel. Only the content pages wait.
- [Report links posted publicly get crawled] → `noindex` keeps them out of search, and shared links point to season pages, not reports. Record this when the share-card spec (`t5-report-images`) is written.

## Migration Plan

No data. The placeholder `/` page and root metadata are replaced. Rollback is a revert. No URL is live in search yet.

## Open Questions

- Legal copy for `/privacy` and `/terms` comes from T8. The stubs ship without it and stay noindex until it lands.
