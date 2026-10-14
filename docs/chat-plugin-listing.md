# Seasonly chat plugin: submission package

Everything the Claude Connectors Directory and the OpenAI Platform ask for when the plugin is submitted (T12, task 6.4). The user submits each listing in its portal; this file holds the copy. Approved by the user on 2026-10-11.

## Server

| Field          | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| Server URL     | `https://seasonly.me/api/mcp`                                   |
| Transport      | Streamable HTTP, stateless                                      |
| Authentication | None (public data; the tool takes four answers, stores nothing) |
| Tools          | 1: `find_season_family`                                         |

### The tool

- **Name:** `find_season_family`
- **Title:** Find my season family
- **Annotations**, each set explicitly, with the justification OpenAI asks for:
  - `readOnlyHint: true`: the tool computes a result from its arguments and writes nothing anywhere.
  - `destructiveHint: false`: it changes no data, on our side or the user's.
  - `openWorldHint: false`: it reaches no outside system; it makes no network request and posts nothing.
- **Input:** `veins`, `jewelry`, `sun`, `hair`, each optional, each an enum. Unknown fields and values are refused with an error that names the field and lists the allowed values.
- **Output:** text content, plus `structuredContent` for the card.

### The card (MCP Apps)

- **Resource:** `ui://seasonly/season-card.html`, MIME `text/html;profile=mcp-app`.
- **CSP:** `connectDomains: []`, `resourceDomains: []`; the card loads nothing from the network.
- **ChatGPT extras:** `openai/widgetCSP.redirect_domains: ["https://seasonly.me"]` (the link's target), `openai/widgetDomain: "https://seasonly.me"`.
- **Allowed link origin:** `https://seasonly.me`. The card's one action opens `https://seasonly.me/analyze?utm_source=chat-plugin&utm_medium=mcp`, and the glue refuses any other origin.

## Listing

**Name:** Seasonly

A brand name; it does not use or imply "GPT", "ChatGPT", "OpenAI", "Claude" or "Anthropic".

**One-liner** (at most 200 characters; 111 here):

> Find your seasonal color family from four quick questions, with 6 of your colors and their hex codes. No photo.

**Description** (at most 2,000 characters):

> Seasonly finds your seasonal color family, Spring, Summer, Autumn or Winter, from four questions about your natural coloring: the color of the veins on your wrist, the jewelry that suits you, what your skin does in the sun, and your natural hair color.
>
> You get your family, a line on what suits it, and 6 of its colors, each with its name and hex code, so you can match them in a shop or an app. Answer "not sure" to any question; if your answers point to no season, Seasonly tells you why.
>
> Seasonly takes no photo and stores nothing: only your four answers reach it. For your exact season out of 12 and all 30 of your colors, the result links to the free photo analysis on seasonly.me.

**Categories:** neither portal offers Lifestyle. Claude: Commerce & Shopping. ChatGPT: Creativity (the dashboard's titles are the directory's sections).

**ChatGPT short description** (at most 30 characters): Find your color season. The ChatGPT long description drops "free" before "photo analysis": the portal flags pricing words.

**Countries (ChatGPT):** all available countries (approved 2026-10-11).

### URLs

| Field         | URL                                                              |
| ------------- | ---------------------------------------------------------------- |
| Documentation | `https://seasonly.me/color-analysis-gpt-alternative#chat-plugin` |
| Privacy       | `https://seasonly.me/privacy#chat-plugin`                        |
| Terms         | `https://seasonly.me/terms`                                      |
| Support       | `https://seasonly.me/terms#contact`                              |
| Website       | `https://seasonly.me`                                            |

### Icon

`apps/web/src/app/icon.svg`, exported to PNG at each size the portal asks for (512 × 512 unless it says otherwise), on a solid background.

## Starter prompts

- Find my color season
- Which colors suit me? I tan easily and have dark brown hair
- Am I a warm or a cool season?

## Test cases

The answers below were run on the local production build on 2026-10-11. The colors come from the season's palette, so they hold until a palette changes.

### Positive (the tool is called)

| #   | Prompt                                                                                                              | Expected call                                                           | Expected result                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | What's my color season? My veins look green, gold jewelry suits me, I tan easily and my hair is medium brown.       | `{ veins: "green", jewelry: "gold", sun: "tan", hair: "medium" }`       | Autumn, "Warm, rich and golden.", 6 colors from Pumpkin to Camel Tan, the link                |
| 2   | Am I a summer or a winter? Blue veins, silver looks better on me, I burn and rarely tan, and my hair is dark brown. | `{ veins: "blue", jewelry: "silver", sun: "burn", hair: "dark" }`       | Winter, "Cool, crisp and bold.", 6 colors from Blue Red to Charcoal, the link                 |
| 3   | I have natural red hair and I burn in the sun. Which colors suit me?                                                | `{ sun: "burn", hair: "red" }`                                          | Spring, "Warm, light and fresh.", 6 colors from Peach to Light Taupe, the link                |
| 4   | Help me find my seasonal color palette.                                                                             | The model asks the four questions, then calls with the answers given    | The family and 6 colors for those answers, the link                                           |
| 5   | I honestly can't tell my vein color, jewelry, tan or hair, it's all hard to say.                                    | `{ veins: "unsure", jewelry: "unsure", sun: "unsure", hair: "unsure" }` | No season: "These answers don't point to one season", why, and the link to the photo analysis |

### Negative (the tool is not called)

| #   | Prompt                                               | Expected behavior                                                                                                        |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Here's my selfie, can you analyze my colors from it? | No call with a photo: the tool takes none. The model may offer the four questions instead.                               |
| 2   | Am I a Soft Autumn or a True Autumn?                 | No call that claims a subtype: the tool gives only the family. The model may point to the photo analysis on seasonly.me. |
| 3   | What should I wear to a wedding in October?          | No call: this is not a question about the person's coloring.                                                             |

## Screenshots (Claude: 3–5 PNG, at least 1000 px wide, cropped to the response)

In `docs/chat-plugin-screenshots/`, taken in task 6.3 on 2026-10-11, each with its prompt:

1. `1-spring.png`: positive case 3, the Spring card.
2. `2-winter.png`: positive case 2, the Winter card.
3. `3-no-result.png`: "Run the Seasonly quiz with all four answers as unsure.", the no-result card. Claude did not call the tool for case 5's wording (BL-35).

## ChatGPT package

OpenAI takes a plugin ZIP, not a form. Its source is `docs/chat-plugin-openai/` (`plugin.json`, `mcp.json`, `assets/`), built with `zip -X -r seasonly-plugin.zip plugin.json mcp.json assets -x '.*'` from that folder. The review test cases above live in `plugin.json`; `tools_triggered` is a string. The portal also wants `review.demo_recording_url`, a reviewer-accessible video.

## Domain challenge (ChatGPT)

The token is at `apps/web/public/.well-known/openai-apps-challenge`, with no trailing newline, served as `text/plain` by a `headers()` rule in `apps/web/next.config.ts`.
