## Context

The upload dialog offers one developer identity, `Individual — OLEG GORDIENOV`. OpenAI's guide says the directory shows the name of the selected identity, so the listing shows that name whatever the package says. A business identity would need a registered company, which Seasonly does not have.

## Decisions

- **The package uses the verified name exactly, in capitals.** Forum reports show rejections for a developer name that does not match the verified one, and OpenAI's guidance is to match it exactly. Pages use normal capitalization, since they are read by people.
- **The operator's name appears on the three pages the listing links.** Privacy, terms (which is also the support URL) and the website URL's section. A shared footer would be broader than the rejection needs and would change an approved board.
- **New tests, no edited ones.** The checks go in a new `operator.test.tsx`; no existing test changes.

## Risks

The name is public from now on, on the site and in the directory. If review still refuses, the next step is business verification, which costs money and is Oleg's call.
