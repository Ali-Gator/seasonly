# Observability Specification

## Purpose

Errors go to Sentry, product events and feature flags to PostHog, real-user Core Web Vitals to Vercel Speed Insights. Each is wired in `apps/web` and stays off until its key is set, so a build or preview without credentials still works.

## ADDED Requirements

### Requirement: Observability is off until its keys are set

Sentry SHALL be disabled when `NEXT_PUBLIC_SENTRY_DSN` is unset, and PostHog SHALL NOT initialise when `NEXT_PUBLIC_POSTHOG_KEY` is unset. Neither SHALL make the build or a page fail.

#### Scenario: No Sentry DSN

- **WHEN** the app starts without `NEXT_PUBLIC_SENTRY_DSN`
- **THEN** Sentry is initialised disabled

#### Scenario: No PostHog key

- **WHEN** the browser loads without `NEXT_PUBLIC_POSTHOG_KEY`
- **THEN** PostHog is not initialised

#### Scenario: Keys are set

- **WHEN** both keys are set
- **THEN** Sentry is enabled with that DSN and PostHog initialises with that key

### Requirement: Every route handler reports its unhandled errors

Every route handler under `apps/web/src/app` SHALL be wrapped in `withErrorCapture`, which sends an unhandled error to Sentry and waits for delivery before rethrowing it. Next's `onRequestError` hook alone SHALL NOT be relied on: in a Vercel production build it does not fire for route handlers, and the function can freeze before an unflushed event leaves.

#### Scenario: A wrapped handler throws

- **WHEN** a handler wrapped in `withErrorCapture` throws
- **THEN** the error is captured, Sentry is flushed, and the same error is rethrown

#### Scenario: A route handler without the wrapper

- **WHEN** a `route.ts` under `apps/web/src/app` does not use `withErrorCapture`
- **THEN** the unit suite fails, naming the file

### Requirement: Production errors and page views reach their services

An unhandled error in a production server route SHALL arrive in Sentry, and a production page view SHALL arrive in PostHog.

**Unenforced:** needs production credentials and the live services; proven once per phase by the phase exit check (`/api/sentry-check` and a page view), recorded in the change's tasks.

#### Scenario: A server route throws in production

- **WHEN** a production route throws
- **THEN** the error appears in the Sentry project

### Requirement: Real-user Core Web Vitals are collected

Every page SHALL report Core Web Vitals through Vercel Speed Insights.

**Unenforced:** Speed Insights reports only from a Vercel deployment; its dashboard is the check.

#### Scenario: A visitor loads a page on a deployment

- **WHEN** a page loads on a Vercel deployment
- **THEN** its Core Web Vitals appear in Speed Insights
