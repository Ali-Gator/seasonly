## Context

See proposal.md for the motivation and the user's choices of 2026-10-11. Here is what exists today:

- **Quiz scoring.** It lives in the core. `classify({ answers })` in `packages/analysis/src/classifier/` returns a `SeasonResult` (quiz-only, confidence ≤ 0.6) or a `NoResult` (`no-answers` | `answers-cancel`). `QuizAnswersSchema` (zod 4 `strictObject`) validates untrusted answers. `seasonFamily(slug)`, `PALETTES[slug].highlights` (6 swatches, name and hex) and `SEASON_COPY[slug].tagline` / `.revealLine` are also exported. The web flow's quiz-only path uses the same `classify`.
- **Routes.** Every `route.ts` under `apps/web/src/app` is wrapped in `withErrorCapture` (`lib/observability/with-error-capture.ts`), and a unit test fails a route without it. `robots.txt` already blocks `/api/`.
- **Origin.** `ORIGIN = "https://seasonly.me"` in `lib/site/routes.ts`.
- **Hosting.** The production custom domain is public. Previews sit behind Vercel SSO, so a chat host cannot reach a preview without a protection-bypass token. Vercel is on Hobby.
- **Packages.** `mcp-handler` 2.3.0 (2026-10-07) is Vercel's MCP adapter for Next. It peers on `@modelcontextprotocol/server` ^2, which depends on zod ^4.2. The app has zod ^4.6, so there is one zod.
- **MCP Apps.** This is the official MCP extension that Anthropic and OpenAI wrote together. A tool points at a `ui://` resource through `_meta.ui.resourceUri`, and the resource is HTML with MIME `text/html;profile=mcp-app`. The host renders it in a sandboxed iframe, with no network unless the CSP grants it. The iframe talks to the host over `postMessage` JSON-RPC. ChatGPT still reads `openai/outputTemplate` as an alias for the same field.

## Goals / Non-Goals

**Goals:**

- One read-only tool whose season equals the web quiz's, shown as an inline card in both hosts and as plain text elsewhere.
- Submittable as it stands: annotations, privacy text, docs URL and test cases ready by about Oct 20, so the user has slack before Oct 24.

**Non-Goals:**

- Photo input, accounts, OAuth, or storing results. The plugin writes no report, so the T13 demand gate does not count plugin results.
- Pre-filling the web quiz from the plugin's answers. The link opens `/analyze` fresh. Pre-filling touches `capture-flow` and can come later if the funnel shows drop-off there.
- Telling ChatGPT from Claude in analytics. The route is stateless, so the client's name is not available per call.
- Rate limiting or BotID. A call is pure computation in microseconds, with no AI call and no write.
- A fullscreen view, a carousel or a second tool.

## Decisions

### 1. Capability `chat-plugin`, owning `app/api/mcp/**` and `lib/mcp/**`

The plan said `mcp-teaser` and `apps/web/app/api/mcp`. The repo's app lives under `apps/web/src/app`, and the tool is no longer a teaser. At archive, the README gets the row `chat-plugin` → `apps/web/src/app/api/mcp/**`, `apps/web/src/lib/mcp/**`. These folders are new, so the row overlaps nothing.

### 2. `mcp-handler`, stateless Streamable HTTP, no SSE

`createMcpHandler(server => …, { serverInfo })` returns a Web `(Request) => Response` handler, served from `app/api/mcp/route.ts` as `POST`, wrapped in `withErrorCapture`. Next answers `GET` and `DELETE` with 405, which is what the handler itself answers for them in stateless mode. 2.x serves the 2026-07-28 protocol and falls back to stateless 2025-era Streamable HTTP from the same handler; it has no SSE and needs no Redis. Claude's review calls SSE deprecated.

Confirmed at apply (2026-10-11, `mcp-handler` 2.3.0, `@modelcontextprotocol/server` 2.3.1): 2.x removed `basePath`, `disableSse` and the three-argument form, and the handler does not read the path. `registerTool` and `registerResource` are the API, and `inputSchema` takes a full Standard Schema (a `z.strictObject`), not a raw shape.

Alternatives considered:

- `@modelcontextprotocol/server`'s web-standard transport directly. This is the fallback if `mcp-handler` 2.3's path handling fights the `src/app` layout. It is a few more lines and the same protocol.
- A hand-rolled JSON-RPC. Rejected: protocol version negotiation, batching and error shapes are exactly what the SDK is for.

The apply step checked the 2.3 API names against the package's README and types; the corrections are above.

### 3. A pure result builder in `lib/mcp/result.ts`

`quizResult(answers)` returns `{ structured, text }`. It calls `classify({ answers })`, and then:

- maps a `SeasonResult` to the family name, tagline, reveal line, the 6 `highlights`, the quiz-alone note and the link;
- maps a `NoResult` to its reason, a suggestion and the link.

The builder holds no copy of season data. Every word and color comes from the core, and only the card's own lines (the quiz note, the action label, the no-result lines) come from the approved board.

Testing it is cheap: the parity test runs every combination of the four answers (each value plus missing: 5 × 5 × 5 × 6 = 750) against `classify` + `PALETTES` + `SEASON_COPY` and asserts that no subtype name or slug appears in the output.

### 4. The tool

- **Name:** `find_season_family`. **Title:** "Find my season family".
- **Input schema:** the core's `QuizAnswersSchema`, so unknown fields and values are refused, with per-field descriptions that use the canvas questions' wording. The SDK takes the full schema, so `lib/mcp` builds a `z.strictObject` from `QuizAnswersSchema.shape`, each field with `.describe()`. The core stays untouched.
- **Annotations:** `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`.
- **Description:** what the tool does and what each answer means, nothing else (spec: annotated read-only).
- **Result:** `structuredContent` (the builder's `structured`) plus one `text` content item. A `NoResult` returns a normal result with `isError` unset.
- **Linking the card:** the tool's `_meta` carries `ui.resourceUri: "ui://seasonly/season-card.html"` and the alias `openai/outputTemplate` (OpenAI calls it an optional compatibility alias; it costs nothing).

### 5. The card: one static HTML string, hand-written glue

`lib/mcp/card.ts` exports `CARD_HTML`, a single HTML document with inline CSS and a small inline script, and no build step. The script follows the MCP Apps spec, stable version 2026-01-26 (checked at apply):

- it sends the `ui/initialize` request (`protocolVersion: "2026-01-26"`, `clientInfo`, `appCapabilities`) and reads `hostContext.theme` from the result;
- it then sends `ui/notifications/initialized`. The host sends nothing, the tool result included, before this;
- it renders on `ui/notifications/tool-result` from `structuredContent`, and follows theme changes on `ui/notifications/host-context-changed`;
- its action sends the `ui/open-link` request with the result's URL;
- it reports its size (`ui/notifications/size-changed`, `{ width, height }`) from a `ResizeObserver`.

ChatGPT's own example uses the same raw `postMessage` bridge, without the `ext-apps` SDK.

The rendering is a pure `renderCard(structured): string` that the script inlines. A jsdom test covers it, and a second test drives the glue with synthetic `MessageEvent`s.

The resource is registered with MIME `text/html;profile=mcp-app`, and its `resources/read` content carries `_meta.ui.csp` with empty `connectDomains` and `resourceDomains`. For ChatGPT it also carries `openai/widgetCSP` with `redirect_domains: ["https://seasonly.me"]` (OpenAI still requires it for external-link targets) and `openai/widgetDomain` (open question 1). Neither allows the card to load anything. The card uses the system font stack and `light-dark()` text colors keyed to the host theme. It shows no logo and keeps the swatch colors as its only strong color, following the ChatGPT UI guidelines: system colors and fonts, no logo, at most two actions, no nested scroll.

Alternatives considered:

- `@modelcontextprotocol/ext-apps`' `App` class. Rejected for now: it has to be bundled and inlined into the HTML, which means a build step for about 40 lines of `postMessage`. It is the fallback if the hand-written glue misbehaves in either host.
- A React component compiled into the card. Rejected: a bundler for one static card.

### 6. The link and attribution

The link is `${ORIGIN}/analyze?utm_source=chat-plugin&utm_medium=mcp`. PostHog records UTM parameters on the first pageview (`$initial_utm_source`). The analytics `before_send` mask only rewrites report paths, so attribution needs no analytics change. The landing funnel can then be broken down by `utm_source`.

### 7. Documentation and privacy anchors

Both sections get the anchor `#chat-plugin`:

- the GPT-alternative page, `https://seasonly.me/color-analysis-gpt-alternative#chat-plugin`, is the listings' documentation URL;
- `/privacy#chat-plugin` is the privacy URL the stores show.

`/privacy` keeps its single page. Until a listing is published, the page offers only the server address, as the spec requires.

### 8. Testing

- **Unit:**
  - the builder: parity over the 750 combinations, the two no-results and the hidden subtype;
  - the card: rendering and glue;
  - the route, by `POST`ing JSON-RPC `Request`s to the exported handler: `initialize`, `tools/list` (one tool, the three annotations, a name of at most 64 characters, `_meta.ui.resourceUri`), `resources/read` (MIME and empty CSP), and `tools/call` with valid, unknown-value and unknown-field input. During the call, a `fetch` spy asserts no outbound request, and no response carries `Set-Cookie`.
- **E2E:** one Playwright `request` test against the built server: `tools/list` over HTTP. This proves the route's path and method wiring in the real Next server.
- **Manual (spec: "works from ChatGPT and Claude"):**
  - the MCP Inspector against the preview;
  - Claude (custom connector) and ChatGPT (developer mode), run by the user on the preview with a bypass token, or on production right after merge.

  Each run is recorded with its date in tasks.md.

### 9. Submission package as a doc, submission by the user

`docs/chat-plugin-listing.md` holds every field both portals ask for. It covers the name "Seasonly", which is a brand and does not imply OpenAI or Anthropic; the one-liner (at most 200 characters) and the description (at most 2,000); categories; the docs, privacy and support URLs (`care@seasonly.me`); the icon (`apps/web/src/app/icon.svg`, exported to PNG at the sizes each portal asks for); and the allowed link origin `https://seasonly.me`. It also holds the 5 positive and 3 negative test cases (prompt, expected tool call or none, expected outcome), the starter prompts, and the screenshot list.

The screenshots are 3–5 PNGs of the card for Claude, at least 1000 px wide and cropped to the response. They are taken from the hosts by the user, or from a local host harness.

The domain challenge, if OpenAI asks for one, is a plain-text file at `apps/web/public/.well-known/openai-apps-challenge`. The token is given by the user.

## Risks / Trade-offs

- **OpenAI rejects the plugin as a demo or an ad.**
  - Mitigation: the "middle" output gives more than the web reveal, and the tool stands alone with no sign-up.
  - Fallback, if rejected: return the full quiz-only result, an output change in `lib/mcp/result.ts` only. That needs the user's yes, because it bypasses email capture.
- **The review outlasts Oct 24.** Submitting is the exit, and listing live is not. Mitigation: plan the submission for about Oct 20–22. Publisher verification starts on Oct 11.
- **MCP Apps glue differs between hosts.** Mitigation: the text content is always complete. A card that fails to render still leaves a full answer, and the `ext-apps` `App` class is the fallback.
- **The open endpoint invites junk traffic.** Mitigation: a call does no I/O and costs microseconds. If Vercel usage shows abuse, add a firewall rate-limit rule for `/api/mcp`, with no code change.
- **A host model sends free text in place of an enum value.** The call is refused with an error that names the field and lists the allowed values, so the model can retry. This is the spec's behavior on purpose.
- **The highlights reveal the subtype.** The 6 colors the plugin returns are exactly the `PALETTES[slug].highlights` that the landing, `/seasons` and every season page show beside the subtype's name. One click on seasonly.me matches them. Accepted with the user's "middle" choice: the plugin still sends the person to the site, where the report adds 30 colors, the neighbours, makeup and draping. If the user wants the subtype kept hidden in fact, the plugin shows family-level colors instead, an output change in `lib/mcp/result.ts` only.

## Migration Plan

There is no data and no migration. The route ships with the PR merge and is live on `seasonly.me` once production deploys. Rollback is to remove the route and delist the plugin in each portal, where a delisting is the user's action.

## Open Questions

- **The widget domain field.** Checked at apply: OpenAI's reference says a dedicated domain is "required when submitting a plugin with UI". The MCP Apps spec calls `_meta.ui.domain`'s format host-dependent, so a value in OpenAI's format could break Claude. The resource sets only the ChatGPT alias `openai/widgetDomain: "https://seasonly.me"` and leaves `ui.domain` unset. Unverified until the ChatGPT run in task 6.3; if ChatGPT ignores the alias, set `ui.domain` and recheck Claude.
- **The test-case format.** The OpenAI portal's exact format for test cases is filled in when the user opens the draft. The content in the listing doc stays the same.
