## 1. Spec delta

- [x] 1.1 `site-content` delta: the ChatGPT listing link and its scenario

## 2. Test, then code

- [x] 2.1 Failing test in `apps/web/src/app/(site)/color-analysis-gpt-alternative/chat-plugin.test.tsx`: the section links the ChatGPT listing ({@link openspec/specs/site-content/spec.md#scenario-the-plugin-section-links-its-chatgpt-listing})
- [x] 2.2 Add the link in `apps/web/src/app/(site)/color-analysis-gpt-alternative/page.tsx` until 2.1 passes; record the listing in `docs/chat-plugin-listing.md`

## 3. Verify, review, archive, ship

- [x] 3.1 `pnpm fix`, `pnpm test`, `pnpm test:eval`
- [x] 3.2 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [x] 3.3 Archive (no Tracker), push, PR, auto-merge with a merge commit
