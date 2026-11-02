## Why

The chat plugin's endpoint can hold a Vercel function open for 5 minutes per request, and it did so 27 times for 21 users between Oct 20 and Oct 28. The quiz page, added in `t22-quiz-page`, makes a promise its button does not keep and can lose a person's answers through its own footer link. Two season pages answer "What makeup suits…?" with no makeup, and a tap on a slow `/analyze?start=camera` load can be lost.

## What Changes

- **BL-114:** `/api/mcp` stops advertising `listChanged` for tools and resources, so a `subscriptions/listen` request ends at once instead of holding its stream open until the 300 s limit.
- **BL-111:** the quiz page's selfie section and FAQ say the result's selfie button keeps the answers, which is true for everyone. "Find my colors" stays a plain `/analyze` link.
- **BL-112:** the footer hides "Color analysis quiz" on the quiz page itself.
- **BL-110:** Soft Summer's and Soft Autumn's makeup lines name their shades, in the pattern of the other ten seasons. Reports and the sample report change with them.
- **BL-108:** the camera start's router sync runs in a microtask instead of a 0 ms timer, so it can no longer discard a link tap replayed during hydration.

## Members

| Id     | Title                                                      | Lane |
| ------ | ---------------------------------------------------------- | ---- |
| BL-114 | `/api/mcp` hits Vercel's 300 s timeout                     | A    |
| BL-111 | The quiz page's "Why a selfie" button drops the answers    | B    |
| BL-112 | The footer's link to the quiz page wipes its progress      | B    |
| BL-110 | Two season FAQs answer the makeup question with no makeup  | B    |
| BL-108 | The camera start's router sync can drop a tap in hydration | B    |

**Parked:** none. BL-109 and BL-107 stay open in the backlog, past the batch's ceiling of five.

**Base branch:** `origin/main` at 9c28bdb, which carries every member's bullet.

**Approved test edits:**

- `packages/analysis/src/report-text/report-text.test.ts:45`, Soft Autumn's makeup line: Decision 3.
- `e2e/analysis-flow.spec.ts:220-222`, the `refreshRouter` comment only, no assertion: Decision 4.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chat-plugin`: a subscription request ends at once.
- `quiz-page`: the footer link is hidden on the quiz page, and the selfie section names the result's button.
- `report-text`: the two soft seasons' makeup lines name shades.
- `capture-flow`: a link tapped while the camera start hydrates still navigates.

## Impact

- **Code:** `apps/web/src/app/api/mcp/route.ts`, `apps/web/src/app/(site)/color-analysis-quiz/page.tsx`, `apps/web/src/components/site-chrome.tsx` and a new client leaf beside it, `packages/analysis/src/report-text/copy.ts`, `apps/web/src/app/(flow)/analyze/flow.tsx`.
- **Pages:** `/color-analysis-quiz`, every report, `/sample-report`, `/seasons/soft-summer`, `/seasons/soft-autumn`.
- **MCP clients:** `initialize` no longer advertises `listChanged`. The one tool never changes, and stateless serving never delivered these notifications to older clients.
- **Canvas:** version 70, with the copy of boards 23, 10, 10b and 18 updated.
