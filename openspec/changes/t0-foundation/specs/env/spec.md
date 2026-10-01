# Env Specification

## Purpose

Catalogues every environment variable the code reads and checks a deployment has them. Values live in Vercel and in `apps/web/.env.local`; the template is `apps/web/.env.example`. Catalogue (phase = earliest phase that needs it):

| Variable                         | Phase | Required | Exposed to browser | Where to get it                                    |
| -------------------------------- | ----- | -------- | ------------------ | -------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`         | 0     | yes      | yes                | Sentry → Project settings → Client Keys (DSN)      |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | 0     | no       | yes                | Defaults to the Vercel environment                 |
| `SENTRY_ORG`                     | 0     | no       | no                 | Sentry org slug; build-time, source-map upload     |
| `SENTRY_PROJECT`                 | 0     | no       | no                 | Sentry project slug; build-time, source-map upload |
| `SENTRY_AUTH_TOKEN`              | 0     | no       | no                 | Sentry → Settings → Auth Tokens (org token)        |
| `NEXT_PUBLIC_POSTHOG_KEY`        | 0     | yes      | yes                | PostHog → Project settings → Project API key       |
| `NEXT_PUBLIC_POSTHOG_HOST`       | 0     | no       | yes                | Defaults to `https://us.i.posthog.com`             |
| `VERIFY_ENV_PHASE`               | 0     | no       | no                 | Read by `pnpm verify:env` only; the phase to check |

## ADDED Requirements

### Requirement: Every variable the code reads is catalogued

A variable read directly from `process.env` under `apps/`, `packages/` or `scripts/` SHALL appear in `apps/web/.env.example` and in this specification's catalogue. Variables the platform injects (`NODE_ENV`, `NEXT_RUNTIME`, `CI`, `VERCEL_ENV`, `NEXT_PUBLIC_VERCEL_ENV`) are exempt.

#### Scenario: A new variable is read without being catalogued

- **WHEN** code reads a variable missing from `.env.example` or the catalogue
- **THEN** the unit suite fails, naming the variable and the file that reads it

### Requirement: Server-only variables never reach the browser

A file that runs in the browser — a `"use client"` module or `instrumentation-client.ts` — SHALL NOT reference a server-only variable.

#### Scenario: A client module references a server secret

- **WHEN** a browser file references `SENTRY_AUTH_TOKEN`
- **THEN** the unit suite fails, naming the file

### Requirement: verify:env reports every variable for a phase

`pnpm verify:env` SHALL report each catalogued variable as `ok`, `missing`, `invalid` or `skipped`, and SHALL exit non-zero when a required variable of the target phase is missing or invalid. A variable from a later phase, or an optional one left unset, SHALL be `skipped`.

#### Scenario: Nothing is set

- **WHEN** `verify:env` runs for phase 0 with no variables set
- **THEN** every required phase-0 variable is `missing` with a hint, optional ones are `skipped`, and it fails

#### Scenario: A malformed value

- **WHEN** a variable is set to a value of the wrong shape
- **THEN** it is reported `invalid`
