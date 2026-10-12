## 1. Spec, test, code

- [x] 1.1 Delta spec: `spec-workflow` accepts `backlog-<n>[-<slug>]` names, skips the Tracker for them, and resolves citations into MODIFIED delta requirements.
- [x] 1.2 `scripts/__tests__/spec-mapping.test.ts` (existing test, edit approved by Oleg 2026-10-11): name regex accepts `backlog-<n>[-<slug>]`; new test citing the "A backlog batch" scenario. `scripts/__tests__/spec-citations.test.ts` (edit approved by Oleg 2026-10-11): the gate resolves MODIFIED delta anchors too, so a fix's test can cite a new scenario before archive.
- [x] 1.3 `.claude/skills/backlog-batch/SKILL.md` and `.claude/skills/backlog-fix/SKILL.md`, ported from runtrip-v2.
- [x] 1.4 Archive skill and `/opsx:archive`: skip the Tracker step for `backlog-*`. `CLAUDE.md` and `openspec/config.yaml`: name the new shape and the two skills.

## 2. Review and archive

- [x] 2.1 `pnpm fix`, `pnpm test`.
- [x] 2.2 Phase review in a fresh subagent, fix findings, log the rest in `docs/backlog.md`.
- [x] 2.3 Archive, PR with auto-merge (merge commit).
