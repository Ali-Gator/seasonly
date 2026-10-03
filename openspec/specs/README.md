# Spec-to-Source Mapping

Each row maps a capability to the source paths it covers; its spec is at `openspec/specs/<capability>/spec.md`. The `check-spec-exists` hook uses this table to enforce Spec -> Tests -> Code.

The second column is parsed, not read: comma-separated globs and nothing else. Notes go under the table.

| Capability          | Source path globs                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `observability`     | `apps/web/src/lib/observability/**`, `apps/web/instrumentation.ts`, `apps/web/instrumentation-client.ts` |
| `site-structure`    | `apps/web/src/lib/site/**`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`                  |
| `color-sampling`    | `packages/analysis/src/sampling/**`                                                                      |
| `season-classifier` | `packages/analysis/src/classifier/**`                                                                    |
| `season-palettes`   | `packages/analysis/src/palettes/**`                                                                      |
| `photo-check`       | `packages/analysis/src/photo-check/**`                                                                   |
| `ui-components`     | `apps/web/src/components/ds/**`                                                                          |
| `report-text`       | `packages/analysis/src/report-text/**`, `apps/web/src/lib/report-text/**`                                |
| `abuse-controls`    | `apps/web/src/lib/abuse/**`                                                                              |

Rows never overlap and every row matches a file: {@link openspec/specs/spec-workflow/spec.md#requirement-mapping-rows-never-overlap}. Each capability owns its own folder, so row order never matters.

Config files (`*.config.*`, such as `apps/web/sentry.server.config.ts`) are spec-exempt, so no row lists them even when a capability owns them. A capability whose sources are all spec-exempt (scripts, config, workflow YAML, docs) has no row: `constitution`, `spec-workflow`, `architecture-boundaries` and `env` are enforced by tests under `scripts/__tests__/`, and `design-tokens` (CSS and JSON only) by `apps/web/src/styles/tokens.test.ts`.

Add a capability's row when its change is archived: until its permanent spec exists, a row would block every edit to its paths.
