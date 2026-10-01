# Seasonly — Development Rules

Governing spec: `openspec/specs/constitution/spec.md` (where truth lives, how it is cited, how it is proven). How specs map to code and how changes run: `openspec/specs/spec-workflow/spec.md`. Concept, Tracker and phase plan: https://claude.ai/code/artifact/23434923-c1ff-47d6-8ce6-7c86fd14856c

## Layout

pnpm workspace, Node 22.18+ (scripts and the analysis core run as TypeScript in plain Node). `apps/web` is the Next.js app (Vercel Root Directory). `packages/analysis` is the pure analysis core every surface shares — see `openspec/specs/architecture-boundaries/spec.md`. `evals/` holds the labeled-photo manifest (photos are git-ignored). `supabase/` holds migrations.

## Workflow: Spec -> Tests -> Code

Work is an OpenSpec change under `openspec/changes/t<N>-<slug>/` (`T<N>` = its Tracker row). Drive it with `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.

1. **Spec first** — the delta at `openspec/changes/<change>/specs/<capability>/spec.md`.
2. **Tests second** — cite the scenario at its permanent path: `{@link openspec/specs/<capability>/spec.md#<scenario-anchor>}`.
3. **Code last.**

- A capability touched for the first time uses `## ADDED Requirements`, never `MODIFIED`.
- Archiving a brand-new capability keeps only its Purpose and Requirements. Re-add Public Interface, Behavior and Edge Cases to `openspec/specs/<capability>/spec.md` after archive.
- Add the capability's row to `openspec/specs/README.md` at archive, not before: until the permanent spec exists, the row blocks every edit to its paths. Leave exempt files (below) out of rows; the hook never gates them.
- A change touching only exempt paths (below) sets `skip_specs: true` in its `.openspec.yaml` instead of inventing a requirement.
- `openspec validate --changes` runs in CI, not in the pre-commit hook: a half-planned change stays committable.

### Exempt from the spec hook

Tests (`__tests__`, `*.test.*`, `*.spec.*`), docs and markdown, config files (`*.config.*`, `tsconfig*.json`, `package.json`), `apps/*/src/components/ui/**`, `apps/*/src/app/globals.css`, `scripts/**`, `apps/*/public/**`, any `*.json` / `*.yaml` / `*.yml` / `*.css`, `.claude/**`, `.env*`, `.gitignore`.

## Review and gates

- Each phase runs on its own branch. Commit freely; review once per phase with the `phase-review` skill (`/code-review high` in a fresh subagent).
- You (the user) approve: a design canvas before its UI proposal, any edit to an existing test, and every paid smoke run. Agents never start a paid run on their own.
- `pnpm fix` then `pnpm test` is the manual phase gate. CI runs `ci.yml` (format, lint, typecheck, unit + citation gate), `openspec.yml` and `e2e.yml` on every push.

## Hooks (`.claude/settings.json`)

1. **check-spec-exists** — blocks `Edit`, `Write` and visible `Bash` writes to a mapped path whose spec is missing. It guards against forgetting, not evasion: a path no README row matches is never blocked, and the Bash shapes it cannot read are pinned in `scripts/__tests__/hook-bash-write-targets.test.ts`.
2. **pre-commit-tests** — runs `format:check`, `lint`, `typecheck`, `test:unit` before any agent `git commit` — {@link openspec/specs/spec-workflow/spec.md#requirement-every-agent-commit-passes-the-fast-gates}.

## Conventions

- pnpm only. Everything written to the repo is English; chat replies are English unless asked otherwise.
- Env vars: `openspec/specs/env/spec.md`. Add a variable to the code, `apps/web/.env.example`, the catalogue and `scripts/verify-env.ts` together, then run `pnpm verify:env` (or `pnpm verify:env 1` for phase 1).
- Route handlers: {@link openspec/specs/observability/spec.md#requirement-every-route-handler-reports-its-unhandled-errors}.
- Eval photos never enter git; `evals/manifest.json` does.
