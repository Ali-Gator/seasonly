## 1. User steps that start now

- [x] 1.1 The user starts OpenAI publisher verification (platform.openai.com → Settings → Organization → General; an individual identity is fine). It can take days, and it gates the ChatGPT submission (6.4). Done when the user says it is submitted. Record the date here, and again when it is verified.

  Started 2026-10-11 as an **Individual**, which matches `/privacy`'s "run by an individual". It was verified the same day (2026-10-11): Individual "Approved", in organization "Personal".

- [x] 1.2 The user confirms their Claude plan can submit to the Connectors Directory (any paid plan; check `claude.ai/directory/manage` opens "Submit new"). Done when confirmed here.

  Confirmed 2026-10-11: the user's screenshot shows the portal's "What would you like to submit?" screen with "MCP connector" available.

## 2. Design and copy (user gate)

- [x] 2.1 Edit the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) in place with the user's yes, or the user pastes this prompt into Claude Design:

  ```text
  Using the "Seasonly" design system's swatch only (the card itself follows the chat host, not
  Seasonly's type), add these boards. Read the existing boards first.

  1. "<next free number> Chat card" in a new row "Chat plugin (T12)": the inline card the
     Seasonly plugin shows inside ChatGPT and Claude, at 375 and 706 px wide, light and dark.
     Use the system font stack and plain black/white/gray text; no logo, no brand color, no
     custom background (ChatGPT adds the app name and icon itself). Content, top to bottom:
     overline "Your season family"; the family name ("Autumn"); the tagline ("Warm, soft and
     earthy."); 6 swatches in one row at 706 and two rows of 3 at 375, each with its color
     name and hex under it (Soft Autumn's highlights); the note "From the quiz alone. A selfie
     gives your exact season and all 30 colors."; one primary button "Get my full analysis".
     No nested scroll, at most one action.
     Also one no-result variant: "These answers don't point to one season" with a line for each
     reason (none chosen / opposite directions) and the same button.
  2. "Color analysis GPT alternative" (row 4, both widths): add a section "Use Seasonly in
     ChatGPT and Claude" before the closing call to action: what the plugin does (4 questions,
     your season family and 6 of its colors, a link to the photo analysis for your exact
     season), that it takes no photo, how to add it (the server address
     https://seasonly.me/api/mcp for a custom connector; directory links once listed), and a
     link to how it handles data (/privacy#chat-plugin).
  ```

  Done when the user approves both boards in chat. Record the date and the canvas version here and in the `mvp-design-canvas` memory. If the user changes any copy, update the `chat-plugin` and `site-content` deltas before 3.x cites it.

  Approved by the user on 2026-10-11, canvas version 37 (1791710465-098c). The canvas was edited in place:
  - **22 Chat card**: 375 and 706 px wide, light and dark.
  - **22b Chat card · no result**: one line per reason:
    - `no-answers`: "Every answer was “Not sure” or in between, so there is nothing to go on yet. Pick the closest answer to each question, or let a selfie read your colors."
    - `answers-cancel`: "Your answers point in opposite directions: some say warm, others say cool. Check your wrist and jewelry in daylight and answer again, or let a selfie read your colors."
  - **19 GPT alternative**: the 375 board gained the `#chat-plugin` section, and a new 1280 board was added at the user's request.
  - **New copy beyond the prompt:** the note "It takes no photo. Only your four answers reach the plugin, and it stores nothing." The user chose to keep it.
  - **No directory links:** none are shown, as the site-content delta requires.

- [x] 2.2 Draft the `/privacy` plugin section (spec: legal-pages "The privacy policy covers the chat plugin") and the `/terms` plugin age rule (spec: legal-pages "The terms say which age rule covers the chat plugin") in a scratch Artifact. The age rule is the user's legal call; the draft only proposes one. Base it on design.md decision 7 and the route as designed: four answers in, nothing stored, Vercel logs and Sentry as for the site, and OpenAI's and Anthropic's privacy policies linked. Look those links up in their current docs, never from memory. Done when the user approves both texts in chat. Record the date here.

  Approved by the user on 2026-10-11 (draft https://claude.ai/artifact/8u4yBmwRaM4EUQvvN2MokE, version 3). The privacy section says an error report from a failed call can include the answers: Sentry attaches request bodies by default. The terms keep "You must be 16 or older to use Seasonly." and add the plugin rule after it.

## 3. Tests first

All tests cite `{@link openspec/specs/<capability>/spec.md#<anchor>}` at the permanent paths.

- [x] 3.1 `chat-plugin` result builder, in a new `apps/web/src/lib/mcp/result.test.ts`:
  - parity: for every combination of the four answers (each value plus missing), a season result matches `classify({ answers })`: the family from `seasonFamily`, the 6 `PALETTES[season].highlights` in order with name and hex, and `SEASON_COPY[season].tagline` and `.revealLine`;
  - the subtype stays hidden: no season name ("Soft Autumn") or slug appears in `structured` or `text` for any result;
  - the link is `https://seasonly.me/analyze?utm_source=chat-plugin&utm_medium=mcp`;
  - all four answers `unsure` gives `no-answers`, and green with silver gives `answers-cancel`; each names no season, shows no colors and carries the link;
  - the text names the family, the tagline, 6 colors with hex, the quiz note and the link.

  Done when the file fails because the module is missing.

  Done 2026-10-11. The quiz alone never gives Soft Autumn, Soft Summer or Bright Spring, so the "subtype stays hidden" scenario (and its test) uses True Autumn; the delta spec was updated to match. The combinations are 750 (each value plus missing), not 320.

- [x] 3.2 `chat-plugin` route, in a new `apps/web/src/app/api/mcp/route.test.ts`, `POST`ing JSON-RPC to the exported handler:
  - `initialize`, then `tools/list`: one tool, a name of at most 64 characters, a title, `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`, and `_meta.ui.resourceUri`;
  - `resources/read` on that URI: MIME `text/html;profile=mcp-app`, and a CSP listing no domain;
  - `tools/call` with valid answers returns `structuredContent` and text;
  - `{ veins: "purple" }` is refused naming `veins`, and a `photo` field is refused naming `photo`;
  - during a call, a `fetch` spy sees no request, and no response sets a cookie.

  Done when the file fails because the route is missing.

- [x] 3.3 The card, in a new `apps/web/src/lib/mcp/card.dom.test.ts` (jsdom):
  - `renderCard` for a season shows the family, the tagline, 6 swatches each with a name and a hex as text, the quiz note and one action;
  - the no-result variant shows its line and the action, and no swatches;
  - the glue: a synthetic `ui/notifications/tool-result` message renders the card, and clicking the action posts `ui/open-link` with the result's URL.

  Done when it fails because the module is missing.

- [x] 3.4 `legal-pages`, in the existing-page test file pattern (a new `apps/web/src/app/(site)/privacy/chat-plugin.test.tsx`; no existing test is edited): `/privacy` has `#chat-plugin`, says only the four quiz answers are received and nothing is stored, and links OpenAI's and Anthropic's privacy policies; `/terms` states the plugin's age rule. Done when it fails for the current pages.
- [x] 3.5 `site-content`, in a new `apps/web/src/app/(site)/color-analysis-gpt-alternative/chat-plugin.test.tsx`: the page has `#chat-plugin` titled "Use Seasonly in ChatGPT and Claude", names `https://seasonly.me/api/mcp`, says no photo is taken, and links `/privacy#chat-plugin`. Done when it fails for the current page.
- [x] 3.6 E2E, in a new `e2e/chat-plugin.spec.ts`: Playwright `request.post("/api/mcp")` with `initialize` and then `tools/list` returns the one tool on the built server. Done when it fails on the current build.

## 4. Dependencies

- [x] 4.1 Read the `mcp-handler` 2.3 README and the MCP Apps spec (`modelcontextprotocol/ext-apps`, stable version) and the OpenAI Apps SDK reference. Confirm or correct, in design.md:
  - the API names (`createMcpHandler`, `registerTool`, `registerResource`, `basePath`, `disableSse`);
  - the `_meta.ui` fields (`resourceUri`, `csp`, and whether `domain` is needed: open question 1);
  - the iframe messages (`ui/initialize`, `ui/notifications/tool-result`, `ui/open-link`, `ui/notifications/size-changed`).

  Done when design.md matches what the packages and spec say.

  Done 2026-10-11, with `mcp-handler` 2.3.0, `@modelcontextprotocol/server` 2.3.1 and the MCP Apps spec 2026-01-26. Corrected in design.md: 2.x dropped `basePath`/`disableSse` and the three-argument form; the route exports `POST` only; the view must send `ui/notifications/initialized` before the host sends the result; ChatGPT needs `openai/widgetCSP.redirect_domains` for the link, and a widget domain, set as the `openai/widgetDomain` alias only (open question 1).

- [x] 4.2 `pnpm --filter web add mcp-handler @modelcontextprotocol/server`, with exact current versions. Done when `pnpm install` is clean, zod resolves to one version (`pnpm why zod`), and typecheck passes.

## 5. Implementation

- [x] 5.1 `apps/web/src/lib/mcp/result.ts` (design.md decision 3), with the approved card copy from 2.1. Done when 3.1 passes.
- [x] 5.2 `apps/web/src/lib/mcp/card.ts` (decision 5): `renderCard` and `CARD_HTML` with the inline glue, styled to the approved Chat card board. Done when 3.3 passes.
- [x] 5.3 `apps/web/src/lib/mcp/server.ts` (the tool and the resource, decision 4) and `apps/web/src/app/api/mcp/route.ts` (decision 2), wrapped in `withErrorCapture`. Done when 3.2 passes and the observability route guard test passes.
- [x] 5.4 The `/privacy` plugin section and the `/terms` age rule from the text approved in 2.2, each with its "Last updated" date bumped, and the GPT-alternative section from the board approved in 2.1, both with `#chat-plugin`. Done when 3.4, 3.5 and the site-content word-floor and placeholder tests pass.
- [x] 5.5 Run `pnpm fix`, `pnpm test` and `pnpm --filter web build`. Done when all pass, the build lists `ƒ /api/mcp`, and 3.6 passes.

  Done 2026-10-11: `pnpm fix` clean, 773 unit tests pass, the build lists `ƒ /api/mcp`, and 55 of 56 E2E tests pass on the built server, 3.6 included. The one failure, `/seasons/Soft-Autumn answers 404`, fails the same way on `main` locally (it passes alone and in CI), so it is logged in the backlog, not fixed here.

## 6. Checks with the user and the submission package

- [x] 6.1 Run the MCP Inspector against the local build: list the tools, read the card, and call the tool with a season answer set, a no-answers set and an invalid value. Show the user the card rendered in the Inspector, or in a local host harness, at both widths and in both themes, in a scratch Artifact. Done when the user confirms it matches the Chat card board. Record the date here.

  Confirmed by the user on 2026-10-11. In place of the MCP Inspector, `curl` against `next start` (the local production build) listed the tool, read the card and called the tool with a season set, a no-answers set, an answers-cancel set, `{ veins: "purple" }` and a `photo` field; both refusals name the field and list the allowed values, and the server logged nothing about the calls. The card from that build runs in a stand-in host harness (https://claude.ai/artifact/A87wsQbn3kbgNyL4QS5Wfr) at 375 and 706 px, light and dark, for all three results. The harness found that the card never shrank its frame; it now reports its own height at render and on resize.

- [x] 6.2 Write `docs/chat-plugin-listing.md` (design.md decision 9). It covers:
  - the name, one-liner and description;
  - the categories;
  - the docs, privacy, terms and support URLs;
  - the icon exports;
  - the allowed link origin and the CSP;
  - 5 positive and 3 negative test cases, and the starter prompts. The negatives are a photo request, a request for the exact subtype by name, and an unrelated fashion question.

  Done when the user approves the listing copy in chat. Record the date here.

  Approved by the user on 2026-10-11, countries: all available.

- [x] 6.3 Host check on the preview (spec: "works from ChatGPT and Claude"). The user creates a Vercel "Protection Bypass for Automation" secret, then adds `https://<preview>/api/mcp?x-vercel-protection-bypass=<secret>` as a custom connector in Claude, and in ChatGPT developer mode. In each, they answer the four questions in a chat. If a host refuses the query-string URL, run this check on production right after merge, before 6.4. Done when both hosts show the card, or the text, with the right family and colors. Record each host, the date and any difference here, and take the carousel screenshots (Claude: 3–5 PNG, at least 1000 px wide, cropped to the response, each with its prompt).
      Done 2026-10-11 on production (`https://seasonly.me/api/mcp`), after merge:
  - **Claude** (claude.ai, custom connector, "No sign-in" detected): cases 2, 3 and the all-unsure request show the right card (Winter, Spring, the no-result card); case 4 asks the four questions; the card shows 6 colors in a row when wide, 3 when narrow. Differences: Claude calls the tool only after the user clicks "Use" once per chat (BL-34), and for case 5 it answered itself instead of calling the tool (BL-35).
  - **ChatGPT** (developer mode is gone; Plugins → Add → "Add custom MCP server", no authentication): cases 1 and 5 call the tool on the first prompt and show the Autumn and no-result cards. The widget is served from `seasonly-me.web-sandbox.oaiusercontent.com`, so the `widgetDomain` field is accepted; the card's button opens `seasonly.me`. The "CSP off" badge is the account's "Enforce CSP for custom apps" setting, not our CSP.
  - Screenshots: `docs/chat-plugin-screenshots/` (Spring, Winter, no-result; 1500–1548 px wide).
- [x] 6.4 Submission (the user's action in each portal, after production serves `/api/mcp`; recorded in the Tracker, not blocking archive):
  - **Claude:** the Connectors Directory, "MCP connector", with the server URL `https://seasonly.me/api/mcp`, no authentication, and the listing from 6.2;
  - **ChatGPT:** a plugin "with MCP" from the OpenAI Platform, once 1.1 is verified. If the portal asks for a domain challenge, the user gives the token, and the agent adds `apps/web/public/.well-known/openai-apps-challenge` in a follow-up PR.

  Target is Oct 20–22. The deadline is Oct 24.

  - **Claude:** submitted by the user on 2026-10-11; the listing shows "In review".
  - **ChatGPT:** submitted by the user on 2026-10-11 from the OpenAI Platform as a plugin ZIP (source in `docs/chat-plugin-openai/`), with the domain verified, the MCP scan clean and the demo video at `review.demo_recording_url`; review status "In review".

## 7. Plan, backlog and archive

- [x] 7.1 Update the plan (Claude Docs concept, https://claude.ai/code/artifact/23434923-c1ff-47d6-8ce6-7c86fd14856c):
  - Add a "T12 planned" line at the top of the Tracker Log, naming the user's choices of 2026-10-11 ("middle" output, an inline card like ChatGPT's plugins, docs on the GPT-alternative page) and the confirmed publishing routes. Set T12 to In progress.
  - In "Architecture and phases", Phase 2:
    - the capability becomes `chat-plugin` at `apps/web/src/app/api/mcp`;
    - the tool returns the family, the tagline, 6 colors and a link, plus a card;
    - the exit check stays "submitted to both by Oct 24".

  Done when the Log shows the line. The Log line and the In progress status were added at proposal, on 2026-10-11. The Phase 2 edits were made on 2026-10-11: the route path is `apps/web/src/app/api/mcp` (also in the stack table), the capability is `chat-plugin`, and the tool line describes `find_season_family` and its card; the exit check is unchanged.

- [x] 7.2 Before archive, log every phase-review finding not fixed, and every defect found on the way that is worth fixing later, in `docs/backlog.md` under the next free `BL-nn` ids, and name them in the PR. Also log:
  - deferred, "if the funnel shows drop-off": pre-filling `/analyze` from the plugin's answers;
  - deferred, "if Vercel usage shows abuse": a firewall rate-limit rule for `/api/mcp`.
  - found at apply: the quiz alone never gives Soft Autumn, Soft Summer or Bright Spring (750 combinations: 10 seasons reached), on the web quiz-only path too, unless the season-classifier spec says so by design;
  - found at apply: Sentry 10.75 attaches an incoming request body (up to about 10 KB) to an error event by default, even with default PII off, so `/privacy`'s Sentry row understates what an error report can carry on the analyze and email routes.

  Done 2026-10-11. The phase review (`/code-review high`, fresh subagent) found six issues, all fixed: tool and resource errors now reach Sentry (the SDK turns them into error results before `withErrorCapture`); the card answers host requests it has no use for; a refused `ui/open-link` falls back to `window.open`; the card's allowed origin comes from `ORIGIN`; the glue test pins the bridge order and a look-alike origin; and an E2E test drives the built, minified card. Logged: BL-29 (quiz-only seasons), BL-30 (Sentry request bodies), BL-31 (local `/seasons/Soft-Autumn` E2E), BL-32 (pre-fill, deferred), BL-33 (rate limit, deferred).

- [x] 7.3 At archive:
  - add the `chat-plugin` row to `openspec/specs/README.md` (`apps/web/src/app/api/mcp/**`, `apps/web/src/lib/mcp/**`);
  - re-add Public Interface, Behavior and Edge Cases to the new permanent `chat-plugin` spec;
  - add a Tracker Log line.

  T12 stays In progress until both submissions in 6.4 are recorded, and is set Done when the Log records them.

  Done 2026-10-11: the README row, the permanent spec's Public Interface, Behavior and Edge Cases, and the Tracker Log line. 6.3 (host check, on production after merge if a host refuses the bypass URL) and 6.4 (submission) are the user's, after merge.
