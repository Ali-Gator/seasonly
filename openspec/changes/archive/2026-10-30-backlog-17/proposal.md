## Why

OpenAI rejected the ChatGPT plugin on 2026-10-30: it could not confirm that the plugin, brand or trademark belongs to a verified person or company. The only verified identity on the OpenAI organization is the individual Oleg Gordienov. The package names "Seasonly" as its developer, and no public page links that brand to him: `/privacy` says "an individual in Bulgaria", `/terms` names nobody, and the domain's WHOIS is private. OpenAI's submission guide requires that public URLs "identify the same publisher as the submission".

`/privacy` also falls short of its own requirement, which already asks for the operator's name.

## What Changes

- `/privacy` and `/terms#contact` name Oleg Gordienov as the person who runs Seasonly, and show the new update date.
- The plugin section of `/color-analysis-gpt-alternative`, which is the listing's website URL, names him as the plugin's publisher.
- `docs/chat-plugin-openai/plugin.json` moves to 1.0.1 with the verified name as `developerName` and `author.name`. The plugin's name stays Seasonly.
- `docs/chat-plugin-listing.md` records the publisher and the rejection.

Oleg approved showing his name on 2026-10-30. Copy only: no layout changes, so no canvas board.

## Members

| Id  | Title                                         | Lane                                    |
| --- | --------------------------------------------- | --------------------------------------- |
| New | The public pages do not name Seasonly's owner | B — approved by Oleg, 2026-10-30, fixed |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `legal-pages`: the privacy policy and the terms name the operator.
- `site-content`: the plugin section names the publisher.

## Impact

`apps/web/src/app/(site)/privacy/page.tsx`, `apps/web/src/app/(site)/terms/page.tsx`, `apps/web/src/app/(site)/color-analysis-gpt-alternative/page.tsx`, `docs/chat-plugin-openai/plugin.json`, `docs/chat-plugin-listing.md`. Oleg uploads the new ZIP and replies to the rejection email himself after this deploys.
