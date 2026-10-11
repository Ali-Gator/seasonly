## Why

Custom GPTs retire on December 11, 2026, and their creators can now migrate a GPT into a ChatGPT plugin. That includes the Personal Color Analysis GPT, #2 in the GPT Store's Lifestyle category. A Seasonly plugin listed in ChatGPT's and Claude's directories first holds the category while it is still empty, and it sends chat users to the photo analysis on seasonly.me. A public listing needs its own review, so T12 has to be submitted by Oct 24, before the web launch on Oct 26.

## What Changes

- **Publishing route (confirmed 2026-10-11 from each store's current docs).**
  - **Claude:** submitted through the Connectors Directory portal (`claude.ai/directory/manage`, "MCP connector"). Any paid plan can submit, and a server with public data may use no authentication. An automatic scan lists the server as a Community connector, and some submissions also get a human review. The portal asks for: every tool's `title` and `readOnlyHint`/`destructiveHint`, a privacy policy, public documentation, an icon and a support contact. An MCP App also needs 3–5 PNG carousel screenshots at least 1000 px wide.
  - **ChatGPT:** submitted as a plugin "with MCP" from the OpenAI Platform. Submission needs a **verified publisher identity** (the user's step; it can take days, so it starts now), the production HTTPS endpoint, an explicit `readOnlyHint`, `destructiveHint` and `openWorldHint` on every tool, 5 positive and 3 negative test cases, listing metadata, a privacy policy, terms and the countries to publish in. A human reviews the plugin.
  - Neither store guarantees a review time, so the exit check is **submitted to both by Oct 24**, not live.
- **What the tool returns (the user's choice, 2026-10-11: "middle").** OpenAI rejects "trial or demo" plugins, plugins that exist mainly to advertise, and a plugin that is a worse version of the website. So the tool gives more than the web reveal does, and still less than the full report:
  - the season family;
  - its tagline and reveal line;
  - the season's 6 highlight colors, each with its name and hex;
  - a note that the result comes from the quiz alone;
  - a link to seasonly.me, where a selfie gives the exact subtype and the 30-color report.

  The subtype's name is not shown, as on the web reveal. The tool takes the 4 quiz answers and classifies them with the analysis core, so chat and web give the same season for the same answers. It takes no photo: a face photo passing through a third-party chat would add biometric exposure (decided 2026-10-01).

- **An inline card in the chat (the user's choice, 2026-10-11: "look like ChatGPT's plugins").** ChatGPT plugins show an inline card, and MCP Apps (`ui://` resources) render the same card in ChatGPT and in Claude. The card shows the family, the tagline, the 6 swatches with name and hex, and one action that opens seasonly.me. It follows the host's look: system font, system colors, no logo. The palette is the only strong color, as on the site. A host without UI shows the text result instead. A canvas board for the card is approved before the card is built.
- **One MCP route.** `POST /api/mcp` (Streamable HTTP, stateless, no authentication) is deployed with the web app. It has one read-only tool, and the route stores nothing.
- **Public documentation (the user's choice, 2026-10-11).** `/color-analysis-gpt-alternative` gains a section "Use Seasonly in ChatGPT and Claude": what the plugin does, that it takes no photo, how to add it, and what it sends. Both stores need documentation, and this page already explains the move to ChatGPT plugins. The board changes first, with the user's approval of the copy.
- **Privacy policy.** `/privacy` gains a section on the plugin: it receives only the four quiz answers, stores nothing, and the chat provider handles the conversation under its own policy. Both stores reject a submission without this. The text needs the user's approval.
- **Submission package (agent drafts, user submits).** `docs/chat-plugin-listing.md` holds what both stores ask for:
  - the name, one-liner, description and categories;
  - the docs, privacy and support URLs;
  - the 5 positive and 3 negative test cases, and starter prompts;
  - the allowed link origin and the CSP;
  - the screenshots.

  The user submits each listing in its portal: publishing is the user's action. The OpenAI domain challenge token goes at `public/.well-known/openai-apps-challenge` if the portal asks for one.

- **Analytics.** The card's link carries `utm_source=chat-plugin`, so PostHog attributes visits that arrive from the plugin. Tool calls are not sent to PostHog: the route records nothing about a person.
- **Name.** The plan called this capability `mcp-teaser`. The tool no longer returns a teaser, so the capability is `chat-plugin`. The change keeps its Tracker name.
- **Backlog and carried items.** Nothing in `docs/backlog.md` or in the plan's "Carried in from finished changes" list concerns the plugin.

## Capabilities

### New Capabilities

- `chat-plugin`: the MCP server at `/api/mcp`. It covers the quiz tool's input, its result and its no-result answers, the inline card, the tool annotations, and the parity with the web classifier. The route stores nothing and needs no authentication.

### Modified Capabilities

- `legal-pages`: `/privacy` says what the chat plugin receives, that it stores nothing, and who handles the conversation. `/terms` says which minimum age covers the plugin: the site says 16+, and OpenAI accepts only plugins that suit ages 13–17.
- `site-content`: `/color-analysis-gpt-alternative` documents the plugin, as the stores' public documentation.

## Impact

- **Code**
  - `apps/web/src/app/api/mcp/route.ts`: the route, wrapped in `withErrorCapture`.
  - `apps/web/src/lib/mcp/`: the server, the tool, the result builder and the card's HTML.
  - `apps/web/src/app/(site)/privacy/page.tsx`: the plugin section.
  - `apps/web/src/app/(site)/color-analysis-gpt-alternative/page.tsx`: the plugin section.
- **Dependencies:** `mcp-handler` (2.3, Vercel's MCP adapter for Next) and its peer `@modelcontextprotocol/server` (2.x, which uses zod ^4.2, so the core's `QuizAnswersSchema` is used as it is).
- **Env:** none. The link uses `ORIGIN` from `lib/site/routes.ts`.
- **Database:** none.
- **Existing tests:** none edited. The `withErrorCapture` guard test covers the new route.
- **Accounts (user):**
  - OpenAI publisher verification, starting today;
  - a paid Claude plan to submit;
  - both portal submissions;
  - a Vercel protection-bypass token, if the connector is tested on a preview: previews sit behind Vercel SSO.
- **Design:** one new board on the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) for the chat card. The GPT-alternative board gains the plugin section.
- **Tracker:** T12 stays In progress after archive, until both stores have the submission.
