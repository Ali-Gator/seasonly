## Context

Pass-2 cleanup sweep: the backlog had no `open` item. Nine gated or deferred items were investigated read-only; two are fixed here, two are dropped by Oleg, five stay parked. See proposal.md for the selection.

| Id     | Lane   | Why                                                                                                                           |
| ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| BL-95  | B      | Trigger not fired (no router refresh, server action or second parameter on `/analyze`); Oleg chose to fix it now (Decision 5) |
| BL-105 | B      | Fix sits in the approved-only gate file; Oleg approved the edit (Decision 3)                                                  |
| BL-18  | retire | Free hourly scheduler offered; Oleg dropped the item (Decision 1)                                                             |
| BL-19  | retire | Cookieless mode offered; Oleg dropped the item (Decision 2)                                                                   |
| BL-102 | D      | Needs labeled real beauty-filtered photos; a synthetic variant is circular                                                    |
| BL-51  | D      | 9 of about 50 production `photo_checked` events, unchanged since 2026-10-18                                                   |
| BL-104 | D      | 0 of about 50 passes with the outline outcome; no `photo_checked` since the BL-68 deploy                                      |
| BL-27  | D      | December 11, 2026 has not arrived; OpenAI still gives that date                                                               |
| BL-28  | D      | No inbound links; PostHog cannot see the pre-redirect URL, Web Analytics is off                                               |

## Goals / Non-Goals

**Goals:**

- Next's router holds the address the camera start leaves, with every other query parameter and the hash kept.
- The gate's anchors match GitHub's for headings that hold numbers.

**Non-Goals:**

- Any change to retention timing or PostHog persistence (BL-18 and BL-19 dropped).
- Excluding Oleg's own sessions from PostHog counts (BL-106 dropped, Decision 4).

## BL-95 — the camera start syncs Next's router

`flow.tsx`'s mount-only `useLayoutEffect` keeps its immediate strip: `history.replaceState(history.state, "", target)` before the first paint, with Next's state kept, because on a fresh load it runs before Next patches history and an entry without `__NA` reloads the page on Back. What changes:

- **Target.** Not the literal `/analyze`: `location.pathname`, the query without `start` (`URLSearchParams.delete("start")`, `?` dropped when nothing is left) and `location.hash`.
- **Router sync.** After the strip, once Next has patched `window.history` (Next 16's AppRouter installs own-property `pushState`/`replaceState` in its mount effect, `next/dist/client/components/app-router.js` ~:233-276), the flow calls `history.replaceState(state, "", target)` again with `state` = the current state minus `__NA`, `_N` and `__PRIVATE_NEXTJS_INTERNALS_TREE`. Next's patch then copies its own keys back (`copyNextJsInternalHistoryState`) and dispatches `ACTION_RESTORE` with the new URL, so the router's canonical URL becomes the stripped address. This is Next's documented native-history integration (`window.history.replaceState` syncs with the router), not the private-state shortcut `backlog-15` declined to lean on.
- **Timing.** On a soft navigation from the landing the patch is already installed when the layout effect runs, so the sync can happen at once. On a hard load it is not: the AppRouter's effect runs after the flow's effects in the same commit. The fix lane picks the smallest wait that is proven by the e2e test on both paths, for example a check for `Object.hasOwn(window.history, "replaceState")` with a deferral to after the commit's passive effects when it is not yet patched. Never sync with Next's keys still in the state: the patch skips its sync for `__NA` data. The wait is bounded: if the patch never appears (jsdom in `flow.dom.test.tsx`, any host without Next), the flow gives up silently, leaves no timer running past unmount, and the immediate strip stands alone.
- **Analytics.** PostHog's `history_change` pageviews fire on a pathname change only, so a same-path `replaceState` adds none. `e2e/funnel.spec.ts` (exactly one `$pageview` of `/analyze`) guards it unchanged.
- **Tests.** New `flow.dom.test.tsx` case for the kept query and hash. New e2e cases in `e2e/analysis-flow.spec.ts`, red before the fix (today a refresh lets Next's history updater write `?start=camera` back); `window.next.router` is set in dev and production builds alike (`app-router-instance.js` ~:397, guarded only by `window.next`), so the Playwright server, `pnpm dev` or `pnpm build && pnpm start`, both expose it: for both the landing tap and a fresh load, `window.next.router.refresh()` leaves the address at `/analyze` and the capture step shown; a fresh load of `/analyze?start=camera&utm_source=tiktok#guide` reads `/analyze?utm_source=tiktok#guide`. Existing tests keep passing unchanged (`flow.dom.test.tsx:309-315` asserts `/analyze` for a plain link, which still holds).
- **Spec text outside requirements.** The capture-flow Behavior bullet on `?start=camera` (spec.md:70) is rewritten to describe the sync and loses "(BL-95)"; the comment above the effect in `flow.tsx` loses its BL-95 sentence.

Files: `apps/web/src/app/(flow)/analyze/flow.tsx`, `apps/web/src/app/(flow)/analyze/flow.dom.test.tsx`, `e2e/analysis-flow.spec.ts`, `openspec/specs/capture-flow/spec.md`.

## BL-105 — `slugify` keeps only GitHub's numbers

`scripts/__tests__/spec-citations.test.ts:68`: the kept class `[^\p{L}\p{M}\p{N}\p{Pc} -]` becomes `[^\p{L}\p{M}\p{Nd}\p{Nl}\p{Pc} -]`, and the JSDoc at :60-62 says decimal digits and letter numbers are kept and other numbers (superscripts, fractions) dropped. github-slugger 1.5.0's `regex.js` (read on unpkg in triage) strips `\xB2`, `\xB3`, `\xB9`, `\xBC-\xBE`, U+2150–U+215F and U+2189 onward, and keeps U+2160–U+2188 (Roman numerals). One new `it` beside "slugs keep combining marks" cites the new spec-workflow scenario and shows a heading with ² and ½ anchored without them, the kept-character citation refused, and Ⅻ kept. No spec heading today holds a `\p{No}` character, so no anchor moves.

Files: `scripts/__tests__/spec-citations.test.ts`.

## BL-18, BL-19 — dropped

Delete both bullets from `docs/backlog.md`. `openspec/specs/data-retention/spec.md:50` keeps its edge case but loses "(BL-18, deferred until Vercel Pro or before paid promotion)", replaced by "(accepted, 2026-10-20)". The analytics spec names no BL-19, so nothing else changes.

## Decisions

### Decision 1 — BL-18: how crops reach "within 24 hours"

The retention job runs once a day on Vercel Hobby (±59 min) with a 24 h cutoff, so a crop can live about 49 h. Eight pages and the report email say "within 24 hours".

- **(a) Supabase `pg_cron` + `pg_net`, hourly, cutoff 23 h.** Free. One new migration `*_retention.sql` enables both extensions and schedules `GET /api/cron/retention` at minute 0 of every hour, reading the bearer from Supabase Vault. pg_cron fires on the minute, so the worst case is 23 h + 1 h = 24 h: the promise holds exactly. The daily Vercel cron stays as a backstop. Oleg stores `CRON_SECRET` in Vault by hand (an agent never enters secrets); rotation must update both copies, or the hourly calls 401 and the backstop hides it.
- **(b) Same scheduler, cutoff stays 24 h.** Worst case about 25 h — an hour over the promise.
- **(c) GitHub Actions hourly.** Free, secret stays out of the DB, but schedules are best-effort (often 5–30 min late) and auto-disabled after 60 days without repo activity.
- **(d) Keep deferred** until Vercel Pro (~$20/month) or paid promotion.

Trade-off: (a) keeps the page copy true with no copy change; it puts one secret in Vault and one more moving part on the database. (b) is the same with no cutoff change but the promise is ~1 h off. (c) avoids the secret in the DB but drifts.

**Recommendation: (a).** The privacy promise holds exactly, free, nothing on the pages changes.

**Answer:** neither — drop BL-18 from the backlog and forget it (Oleg, 2026-10-20). The ~49 h worst case stays as the data-retention spec describes it.

### Decision 2 — BL-19: PostHog cookie without consent

posthog-js sets a first-party cookie plus localStorage with no consent; disclosed on `/privacy` only.

- **(a) `cookieless_mode: "always"`.** One init option. No cookie, no browser storage; PostHog identifies a visit by a server-side hash of IP + browser + a daily salt. Needs the PostHog project setting "Cookieless server hash mode" switched on **before** the deploy, or every event is dropped (cookie-based events are unaffected by the setting, so it can be flipped any time first). Costs: a visitor becomes a new person each day (funnels crossing midnight UTC split); GeoIP is null on cookieless events (nothing in the app or specs uses geo). Replay and flags are already off. `/privacy` copy changes, and `legal-pages.test.tsx:72` (`/first-party cookie/`) changes.
- **(b) Consent banner with `on_reject`.** Keeps full identity for those who accept; needs a canvas design (lane C) and brings back a consent UI the product removed in t11.
- **(c) Keep deferred** until paid promotion or a complaint.

**Recommendation: (a).** Removes the ePrivacy risk instead of managing it, no UI, and nothing in the product identifies a person.

`/privacy` wording for (a):

- PostHog row: "Anonymous steps through the site, with report ids hidden and no email address. It sets no cookie."
- Cookies section: "We set no cookies. PostHog counts anonymous steps through the site without storing anything in your browser. It tells visits apart with a code made from your network address and browser, which changes every day and is not kept."
- "Last updated" becomes the ship date.

Existing test edit: `apps/web/src/app/(site)/legal-pages.test.tsx:72` `expect(privacy).toMatch(/first-party cookie/)` becomes `expect(privacy).toMatch(/We set no cookies/)` — the old assertion pins the cookie this change removes on purpose.

**Answer:** neither — drop BL-19 from the backlog and forget it (Oleg, 2026-10-20). The cookie stays, disclosed on `/privacy`.

### Decision 3 — BL-105: gate slug keeps superscripts and fractions

`slugify` in `scripts/__tests__/spec-citations.test.ts:68` keeps every `\p{N}`; github-slugger 1.5.0 drops `\p{No}` (², ³, ½, ¼) and keeps `\p{Nd}` and `\p{Nl}`. The requirement "Citations are gated at every commit" says the anchor is the slug "as GitHub renders it", so the gate breaks its own spec today, though no heading triggers it.

- **(a) Fix now.** In the approved-only gate file: the regex class `\p{N}` → `\p{Nd}\p{Nl}` and its doc comment (`:60-62`); one new `it` beside "slugs keep combining marks" (~`:722`) showing ² and ½ dropped and Ⅻ kept. No existing `it` or fixture changes. A new spec-workflow scenario under "Citations are gated at every commit" gives the test its citation.
- **(b) Keep deferred** until a heading holds one, or the next gate-file change.

**Recommendation: (a).** One-character-class fix, the spec already demands it, and this sweep exists to clear deferred items.

**Answer:** (a), fix now, including the gate-file edit (Oleg, 2026-10-20).

### Decision 4 — BL-106: leaving Oleg's own sessions out of PostHog counts (new in this triage)

The project's test-account filter is cohort 259440 "Internal / Test users", which holds 0 people, and the site sends no `$identify`, so BL-51's and BL-104's "excluding Oleg's own sessions" was done by host only.

- **(a) Opt-out link.** `?analytics=off` calls `posthog.opt_out_capturing()`, persisted per browser; `?analytics=on` undoes it. Counts by host become exact. No existing test changes.
- **(b) Tag and keep.** The same link registers an `internal` super property instead. Needs the analytics rule "no code calls `register`" reversed, its scan test edited and the project's test-account filter changed.
- **(c) Not now.** Trigger counts stay upper bounds.

**Recommendation: (a).**

**Answer:** none — drop BL-106 from the backlog and forget it (Oleg, 2026-10-20). It was removed before it reached `main`; BL-51 and BL-104 now say their counts are by host only and include Oleg.

### Decision 5 — batch size and BL-95

With BL-18, BL-19 and BL-106 dropped the batch had one fix. The options were to plan it short or pull BL-95 forward, before its trigger.

**Answer:** add BL-95, then plan the short batch of two fixes (Oleg, 2026-10-20).

## Risks / Trade-offs

- [BL-95 leans on Next's history patch being installed by the time the deferred sync runs] → the e2e router-refresh case runs on both the soft and the hard path; a Next upgrade that changes the patch fails it.
- [BL-95 fixes nothing a user sees today] → accepted by Oleg; it removes a trap for the first router refresh or server action on `/analyze`.
- [BL-105 has no live heading to fix] → accepted; the gate's anchor rule now matches its spec.
- [BL-18, BL-19 stay unfixed] → Oleg's call; the data-retention spec and `/privacy` already disclose both.

## Corrections to the bullets

- **BL-95:** the bullet's fix ("a deferred `replaceState` without `__NA`") is right, but the hard-load timing is not a plain `setTimeout`: the AppRouter's patch lands in a parent effect after the flow's own.
- **BL-27** (parked): the route title has no tense; the stale copy is the description, h1, lead, h2 "What changes on December 11", two body sentences and the closing Note.
