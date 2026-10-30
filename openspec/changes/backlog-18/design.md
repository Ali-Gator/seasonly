## Lanes

| Id     | Lane | Why                                                                 |
| ------ | ---- | ------------------------------------------------------------------- |
| BL-114 | A    | Reproduced locally, the fix is one option, no existing test changes |
| BL-111 | B    | Approved canvas copy changes                                        |
| BL-112 | B    | Approved footer changes on one page                                 |
| BL-110 | B    | Report copy changes, and an existing test pins it                   |
| BL-108 | B    | A comment in an existing test goes stale                            |

No member is parked, and no status in `docs/backlog.md` needed correcting.

## Members

### BL-114: the MCP stream

`createMcpHandler` gets `capabilities: { tools: { listChanged: false }, resources: { listChanged: false } }`, through the SDK's `ServerOptions`. `registerTool` and `registerResource` keep a value already set (`getCapabilities().tools?.listChanged ?? true`), and `subscriptions/listen` honors only what is advertised. A listen then gets its acknowledgement and a `complete` result at once. Files: `apps/web/src/app/api/mcp/route.ts`, `route.test.ts`.

Not chosen: `maxSubscriptions: 0` answers JSON-RPC error -32603, which a host may log as a failure or retry. Lowering `maxDuration` only shortens the hang.

**How far this is proven.** The cause was found by elimination. In an in-memory run on the pinned `mcp-handler` 2.3.0, with a stand-in server with one tool and one resource, 1 of 11 POST shapes stayed open: a 2026-07-28 revision listen asking for `toolsListChanged`. Vercel's logs could not confirm it: the team is on Hobby, and neither `get_runtime_logs` nor the CLI could show the HTTP method of the 27 timed-out requests. How a real host reacts to `complete` is untested.

**How to check it shipped.** The `get_runtime_errors` cluster for `/api/mcp` stays empty over a window like the original nine days. The route had also been quiet for about 41 hours at triage with no code change, so a short quiet spell proves nothing.

### BL-111: the selfie line

The sentence and the FAQ answer change, and the button stays a plain `/analyze` link. Files: `apps/web/src/app/(site)/color-analysis-quiz/page.tsx`, a new test beside `page.test.tsx`. The new line is longer, so the 250-word floor holds.

The header's "Find my colors" drops the answers too, which is why rewording beat carrying them on this one button.

### BL-112: the footer link

A small client leaf reads `usePathname()` and renders nothing on `/color-analysis-quiz`; `site-chrome.tsx` stays a server component and wraps only that row. The server knows the path while prerendering, so the row is absent from the first HTML. Files: `apps/web/src/components/site-chrome.tsx`, the new leaf and its test.

`page.test.tsx:60-68` renders `SiteShell` outside a router, where `usePathname()` is null, so it stays green and still states the rule for other pages. It needs no edit. The page must stay statically rendered (`site-structure`), which the fix checks in the build output.

### BL-110: the makeup lines

Two strings in `packages/analysis/src/report-text/copy.ts`. `seasonFaq` already passes `makeupIntro` through, so the season pages and reports cannot disagree. Stored reports read the copy at render, so nothing migrates. Only the report and the FAQ render this field.

**Correction to the bullet.** The two seasons do not share one line, and Soft Autumn's does not say "cool": it reads "Stay in the same warm, muted family as your clothes." Each line follows the same pattern with no shade.

### BL-108: the router sync

The sync effect's `setTimeout` becomes `queueMicrotask` with a cancel flag, which the cleanup sets, so StrictMode's second run still syncs once. Files: `apps/web/src/app/(flow)/analyze/flow.tsx`, `flow.dom.test.tsx`, the `refreshRouter` comment.

The ordering still holds. Next's history patch is a passive effect of an ancestor, and React runs a commit's passive effects in one synchronous pass, so a microtask cannot run before it. Hydration replays a tap under React's capture listener, and the browser runs a microtask checkpoint between the capture and bubble listeners of a trusted click, so the sync lands before Link's `onClick` pushes.

**Correction to the bullet.** The router-refresh e2e does not prove this fix: it never taps during hydration, and it passes with either mechanism. It stays as the guard that the sync runs after Next's patch.

**The test.** A new DOM test asserts that the sync's `replaceState` has run after one microtask turn following mount. It is red with the timer and green with the microtask, and it is deterministic. No trusted-click e2e: hitting the hydration window needs CPU throttling, which is flaky, or holding React's scheduler, which is unproven.

**Known gap.** An address with stripped answers but no dispatch has no forced passive flush, so a tap between that commit and the scheduled flush can still be discarded. The window is one scheduler task and the same under either mechanism.

## Decisions

### Decision 1: BL-111, how to make the selfie line true

- **Options:** reword the line; have the button carry the answers once the result shows; drop the sentence.
- **Trade-off:** carrying needs shared client state across two sections and still leaves a line that is false for someone who has not finished, and the header's button still drops answers. Dropping loses the reassurance. Rewording leaves a person who finished and taps this button being asked again, but no longer promised otherwise.
- **Recommendation:** reword. True for everyone, keeps the page's one client island.
- **Answer:** reword, "The selfie button on your quiz result keeps your answers, so you won't be asked again." and the FAQ "…add a selfie from your result. Your answers carry over." (Oleg, 2026-10-30)

### Decision 2: BL-112, the footer on the quiz page

- **Options:** hide the link there; keep the row as plain text; accept the defect.
- **Trade-off:** plain text keeps the look but adds a current-page pattern used nowhere else. Accepting leaves progress at risk. Hiding departs from the footer on the page's own boards, and those boards were updated.
- **Recommendation:** hide. A link to the page you are on does nothing useful and can cost progress.
- **Answer:** hide it on this page only (Oleg, 2026-10-30)

### Decision 3: BL-110, where the shades go

- **Options:** rewrite the two report lines; extend only the FAQ answer; not now.
- **Trade-off:** extending needs a two-season special case or repeats shades on the other ten, and it reverses the spec's "answered with the season's shared makeup line". Rewriting loses "same family as your clothes", and changes reports and the sample report. It edits the existing test `report-text.test.ts:45`, which pins the old Soft Autumn line.
- **Recommendation:** rewrite. Two strings and no new branch, with each season's own lip shades.
- **Answer:** rewrite, including the edit to `report-text.test.ts:45` (Oleg, 2026-10-30)

### Decision 4: BL-108, the stale test comment

- **Options:** edit the comment at `e2e/analysis-flow.spec.ts:220-222`; leave it and log it.
- **Trade-off:** the comment says "timer", which goes stale. No assertion changes either way.
- **Recommendation:** edit it, wording only.
- **Answer:** edit the comment (Oleg, 2026-10-30)

## Canvas

Canvas version 70 (1793371069-7ffc), copy edited in place, no new boards and no design-system change:

- "23 Quiz page" at 375 and 1280 (`QuizPage.dc.html`, `QuizPage-1280.dc.html`): the selfie line, the FAQ answer, and the footer row removed.
- "10 Full report" at 375 and 1280, "10b Full report · quiz only" at 375 and 1280, "18 Sample report": Soft Autumn's makeup line. Soft Summer's line is on no board.

**Approved:** Oleg, 2026-10-30, by the wording and the board edits named in Decisions 1 to 3. These are text changes only; the boards were not reviewed again as drawings.
