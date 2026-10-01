## 1. Day 1 — accounts and skeleton

- [x] 1.1 git init, private GitHub repo, branch `phase-0-foundation`
- [x] 1.2 pnpm workspace, `apps/web` (Next 16, TS strict, Tailwind v4), `packages/analysis` placeholder
- [x] 1.3 Prettier, ESLint, Vitest, Playwright, root scripts
- [x] 1.4 Vercel project `seasonly` (Root Directory `apps/web`, Node 22.x, git-linked), Sentry project `blockdev/seasonly`
- [ ] 1.5 User: Supabase and PostHog projects, seasonly.me (T1) — open

## 2. Day 2 — governance and CI

- [x] 2.1 Port constitution, spec-workflow, template, hooks, citation gate, settings, `/opsx`, skills
- [x] 2.2 No-overlap mapping test, architecture-boundaries spec and test, `openspec/config.yaml` context
- [x] 2.3 `ci.yml`, `openspec.yml`, `e2e.yml`
- [ ] 2.4 User: protect `main` so a PR needs green CI — open: GitHub returns 403 on a private repo without Pro

## 3. Day 3 — platform wiring

- [x] 3.1 Env catalogue, `.env.example`, `verify:env`
- [x] 3.2 Sentry, PostHog, Speed Insights wired
- [x] 3.3 Supabase CLI init, first empty migration
- [x] 3.4 Eval harness skeleton, green on an empty set
- [x] 3.5 Placeholder landing deployed; a preview URL per push (seasonly.me waits on T1)
- [x] 3.6 Phase review (18 findings, fixed), archive, Tracker updated

## 4. Exit criteria (each shown by a deliberate failure)

- [x] 4.1 An edit to a mapped path with no spec is blocked by the hook (exit 2, also fired live on `apps/web/instrumentation.ts`)
- [x] 4.2 A test citing a missing spec anchor fails CI (the citation gate names file and line)
- [x] 4.3 `packages/analysis` importing `react` fails lint; `window` fails typecheck
- [x] 4.4 A change with no spec delta and no `skip_specs` fails `openspec validate` (exit 1)
- [ ] 4.5 Sentry receives a test error (done: SEASONLY-1 from a Vercel deployment) and PostHog a pageview from production — PostHog open until its key is set
