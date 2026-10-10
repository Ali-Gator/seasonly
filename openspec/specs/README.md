# Spec-to-Source Mapping

Each row maps a capability to the source paths it covers; its spec is at `openspec/specs/<capability>/spec.md`. The `check-spec-exists` hook uses this table to enforce Spec -> Tests -> Code.

The second column is parsed, not read: comma-separated globs and nothing else. Notes go under the table.

| Capability          | Source path globs                                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observability`     | `apps/web/src/lib/observability/**`, `apps/web/instrumentation.ts`, `apps/web/instrumentation-client.ts`                                                                                                              |
| `site-structure`    | `apps/web/src/lib/site/**`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`                                                                                                                               |
| `color-sampling`    | `packages/analysis/src/sampling/**`                                                                                                                                                                                   |
| `season-classifier` | `packages/analysis/src/classifier/**`                                                                                                                                                                                 |
| `season-palettes`   | `packages/analysis/src/palettes/**`                                                                                                                                                                                   |
| `photo-check`       | `packages/analysis/src/photo-check/**`                                                                                                                                                                                |
| `ui-components`     | `apps/web/src/components/ds/**`                                                                                                                                                                                       |
| `report-text`       | `packages/analysis/src/report-text/**`, `apps/web/src/lib/report-text/**`                                                                                                                                             |
| `abuse-controls`    | `apps/web/src/lib/abuse/**`                                                                                                                                                                                           |
| `capture-flow`      | `apps/web/src/app/(flow)/analyze/page.tsx`, `apps/web/src/app/(flow)/analyze/flow.tsx`, `apps/web/src/app/(flow)/analyze/flow-state.ts`, `apps/web/src/app/(flow)/analyze/_capture/**`, `apps/web/src/lib/capture/**` |
| `quiz`              | `apps/web/src/app/(flow)/analyze/_quiz/**`                                                                                                                                                                            |
| `season-reveal`     | `apps/web/src/app/(flow)/analyze/_reveal/**`, `apps/web/src/app/api/analyze/**`, `apps/web/src/lib/analysis/**`, `supabase/migrations/*_reports.sql`                                                                  |
| `share-card`        | `apps/web/src/app/images/share/**`, `apps/web/src/lib/share-card/**`                                                                                                                                                  |
| `palette-image`     | `apps/web/src/app/images/palette/**`, `apps/web/src/lib/palette-image/**`                                                                                                                                             |
| `draping-preview`   | `apps/web/src/app/api/face/**`, `apps/web/src/lib/draping/**`, `supabase/migrations/*_crops_bucket.sql`                                                                                                               |
| `email-capture`     | `apps/web/src/app/(flow)/analyze/_email/**`, `apps/web/src/app/api/reports/[id]/email/**`, `apps/web/src/lib/email/**`, `supabase/migrations/*_report_emails.sql`                                                     |
| `report-page`       | `apps/web/src/app/(report)/**`, `apps/web/src/lib/report/**`                                                                                                                                                          |
| `interest-button`   | `apps/web/src/app/api/reports/[id]/interest/**`, `apps/web/src/lib/interest/**`, `supabase/migrations/*_interest_clicks.sql`                                                                                          |
| `analytics`         | `apps/web/src/lib/analytics/**`                                                                                                                                                                                       |
| `data-retention`    | `apps/web/src/app/api/cron/**`, `apps/web/src/lib/retention/**`, `supabase/migrations/*_retention.sql`                                                                                                                |
| `legal-pages`       | `apps/web/src/app/(site)/privacy/**`, `apps/web/src/app/(site)/terms/**`                                                                                                                                              |
| `analysis-eval`     | `evals/*.ts`                                                                                                                                                                                                          |

Rows never overlap and every row matches a file: {@link openspec/specs/spec-workflow/spec.md#requirement-mapping-rows-never-overlap}. Each capability owns its own folder, so row order never matters.

Config files (`*.config.*`, such as `apps/web/sentry.server.config.ts`) are spec-exempt, so no row lists them even when a capability owns them. A capability whose sources are all spec-exempt (scripts, config, workflow YAML, docs) has no row: `constitution`, `spec-workflow`, `architecture-boundaries` and `env` are enforced by tests under `scripts/__tests__/`, and `design-tokens` (CSS and JSON only) by `apps/web/src/styles/tokens.test.ts`.

`apps/web/src/lib/supabase.ts`, the server client shared by `abuse-controls`, `season-reveal` and `draping-preview`, has no row: no capability owns it alone. `apps/web/src/lib/og/**`, the fonts, token colors and shared pieces of the share card and the palette image, has no row for the same reason: `share-card` and `palette-image` share it. `apps/web/src/lib/http/**`, the browser POST with a time limit, has no row either: `email-capture` and `interest-button` share it.

Add a capability's row when its change is archived: until its permanent spec exists, a row would block every edit to its paths.
