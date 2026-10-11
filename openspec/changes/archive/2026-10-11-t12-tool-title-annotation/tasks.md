## 1. Spec, test, code

- [x] 1.1 Delta spec: the annotations requirement names `title`; new scenario "The title annotation".
- [x] 1.2 New unit test in `apps/web/src/app/api/mcp/route.test.ts` citing the new scenario (no existing test changes).
- [x] 1.3 `apps/web/src/lib/mcp/server.ts`: add `title` to the tool's annotations.

## 2. Backlog and archive

- [x] 2.1 Delete BL-36 from `docs/backlog.md`.
- [x] 2.2 `pnpm fix`, `pnpm test`, archive, PR with auto-merge.
