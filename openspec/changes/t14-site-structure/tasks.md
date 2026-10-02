## 1. Decisions before design

- [x] 1.1 User: confirm the season slug naming (design.md, decision 1): true/bright canonical with warm/clear as redirects, or the reverse. Confirmed true/bright on 2026-10-02.
- [x] 1.2 Add Tracker row T14 "Site map and SEO foundation" and link this change. Done when the row is visible in the Tracker tab.

## 2. Designs (canvas, no code)

- [x] 2.0 Run the design brief in a separate design session (prompt given in chat on 2026-10-02).
- [x] 2.1 Add a shared header and footer to the MVP canvas, at phone and desktop sizes. Point the landing artboards at real routes and add an "Explore the 12 seasons" block. Done when the published canvas shows them.
- [x] 2.2 Add the `/seasons` index and the `/seasons/soft-autumn` season page template, each at 375 and 1280. Done when the published canvas shows them.
- [x] 2.3 Add `/how-it-works`, `/sample-report`, `/color-analysis-gpt-alternative`, the legal-text template (`/privacy`, `/terms`) and 404, each at 375. Done when the published canvas shows them.
- [x] 2.4 User: approve the updated canvas. **Gate:** no task in sections 3–5 starts before this one is checked. Approved 2026-10-02.

## 3. Tests first (cite `openspec/specs/site-structure/spec.md`)

- [x] 3.1 Write unit tests for the route map: the 12 slugs, every page file mapped, unique titles for indexable routes, noindex unless ready, and `/analyze` and `/r/` never indexable. The page-file scan strips `(group)` segments and maps `[season]` and `[id]` to their patterns. Done when they fail for the missing module.
- [x] 3.2 Write unit tests for `sitemap()` (ready routes only, all 12 season URLs when ready, no flow, report or API URLs) and `robots()`. Done when they fail for the missing files.
- [x] 3.3 User: approve replacing `e2e/landing.spec.ts`. It asserts the placeholder heading "Seasonly", which the new landing stub drops. Approved 2026-10-02; the test now checks status 200, a Seasonly title and an h1, which hold before and after the swap.
- [x] 3.4 Write e2e tests: every static route answers 200 with the apex canonical; a query string is dropped from the canonical; an unknown path and an unknown slug answer 404 with noindex; `/seasons/clear-winter` answers 308 to `/seasons/bright-winter`; `/r/unknown` answers 404. Done when they fail against the current app.

- [x] 3.5 Write unit tests for the design tokens (cite `openspec/specs/design-tokens/spec.md`): every non-`sample-` token in `apps/web/src/styles/tokens.json` is a matching `:root` variable in `globals.css`, no `--sample-` variable exists, and each type class matches its type style. Add to 3.4's e2e: a page makes no Google Fonts request, and the body is paper on ink. Done when they fail against the current `globals.css`.

## 4. Code

- [x] 4.1 Add `apps/web/src/lib/site/routes.ts` (origin, routes, slugs, aliases) and `pageMetadata()`. Done when the 3.1 tests pass.
- [x] 4.2 Add `apps/web/src/app/sitemap.ts` and `robots.ts`. Done when the 3.2 tests pass.
- [x] 4.3 Add alias redirects to `next.config.ts`, built from the alias map. Done when the 308 e2e test passes.
- [x] 4.4 Add the `(site)` and `(flow)` route-group layouts and stub pages for every route in the approved layout. Season pages use `generateStaticParams` and `dynamicParams = false`; `/r/[id]` calls `notFound()`; `/analyze` is a stub. Done when the 3.4 e2e tests pass.
- [x] 4.5 Copy the design system's `tokens.json` to `apps/web/src/styles/tokens.json`, add the `:root` variables and type classes to `globals.css` (from the canvas `base.css`), load Bodoni Moda (with `opsz`) and Instrument Sans with `next/font`, and paint the body paper on ink. Done when the 3.5 tests pass.
- [x] 4.6 Run `pnpm fix` then `pnpm test`. Done when both are green.

## 5. Ship and archive

- [ ] 5.1 Check a Vercel preview: `/sitemap.xml` is empty of stubs, `/robots.txt` matches the spec, a season page shows the apex canonical, and `/seasons/Soft-Autumn` answers 404 (Vercel is case-sensitive; local `next start` on macOS is not). Done when each is confirmed on the preview URL.
- [ ] 5.2 Run phase review, archive, re-add Public Interface, Behavior and Edge Cases to `openspec/specs/site-structure/spec.md` and `openspec/specs/design-tokens/spec.md` (no README row for `design-tokens`: its files are all spec-exempt), and add its README mapping row (`apps/web/src/lib/site/**`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`). Done when `openspec validate --changes` passes and the Tracker Log has a line.
- [ ] 5.3 Replace the "Routes reserved now" line in the architecture doc's "SEO and performance" section with a link to the `site-structure` spec. Done when the doc shows the link.
