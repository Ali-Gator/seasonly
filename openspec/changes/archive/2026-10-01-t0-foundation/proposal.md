## Why

Seasonly starts with governance, not features: agents build the web MVP from Phase 1 on, and every change must run under the same spec-first gates from its first commit. This change ports runtrip-v2's OpenSpec governance into a pnpm workspace and lands the platform wiring the MVP needs.

## What Changes

- pnpm workspace: `apps/web` (Next.js 16, TypeScript strict, Tailwind v4) and `packages/analysis` (pure core, placeholder export)
- Prettier, ESLint (`--max-warnings=0`), Vitest, Playwright; root scripts `fix`, `test`, `test:unit`, `test:e2e`, `test:eval`
- Governance ported from runtrip-v2 with workspace paths: constitution, spec workflow, spec hook, pre-commit gate, citation gate, `/opsx` commands and `openspec-*` skills
- New: no-overlap mapping test, architecture-boundaries capability, change names tied to Tracker IDs
- CI: `ci.yml` (format, lint, typecheck, unit + citation gate), `openspec.yml`, `e2e.yml`
- Env catalogue, `.env.example`, `verify:env`; Sentry, PostHog and Speed Insights wired, off until keys are set
- Supabase CLI config and first empty migration; eval harness skeleton green on an empty set

## Capabilities

### New Capabilities

- `constitution`: where truth lives, how it is cited and proven
- `spec-workflow`: how specs map to sources, what blocks an edit, how changes are validated and archived
- `architecture-boundaries`: the analysis core stays pure
- `env`: every environment variable is catalogued and checked
- `observability`: errors, product analytics and Core Web Vitals, off until configured

### Modified Capabilities

None.

## Impact

New repository. No runtime behavior beyond a placeholder landing page and a deliberate Sentry probe route.
