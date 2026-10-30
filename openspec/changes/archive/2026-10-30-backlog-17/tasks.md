## 1. Spec deltas

- [x] 1.1 `legal-pages` delta: the privacy policy and the terms name the operator
- [x] 1.2 `site-content` delta: the plugin section names the publisher

## 2. Tests, then copy

- [x] 2.1 Failing tests in new `apps/web/src/app/(site)/privacy/operator.test.tsx` and `apps/web/src/app/(site)/color-analysis-gpt-alternative/publisher.test.tsx`
- [x] 2.2 Name the operator on `/privacy`, `/terms#contact` and the plugin section; update both legal pages' dates, until 2.1 passes

## 3. Package

- [x] 3.1 `plugin.json` 1.0.1: `developerName` and `author.name` are the verified name, release notes updated
- [x] 3.2 `docs/chat-plugin-listing.md`: the publisher and the 2026-10-30 rejection

## 4. Verify and ship

- [x] 4.1 `pnpm fix`, `pnpm test`, `pnpm test:eval`
- [x] 4.2 Review in a fresh subagent; fix, log the rest in `docs/backlog.md`
- [x] 4.3 Add the 2026-10-30 approval to the `legal-pages` Behavior; log the canvas gap as BL-113
- [x] 4.4 Archive without the Tracker, push, PR, auto-merge with a merge commit
