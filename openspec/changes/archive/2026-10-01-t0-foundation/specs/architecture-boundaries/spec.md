# Architecture Boundaries Specification

## Purpose

Keeps the analysis core portable. Every surface (web, Claude/ChatGPT plugin, later iOS and a browser extension) is an adapter over `packages/analysis`, so a season never differs between surfaces. The core takes raw pixels (`Uint8ClampedArray`, width, height) plus face landmarks and returns numbers and a season; landmark detection is the per-platform adapter and stays outside it.

## ADDED Requirements

### Requirement: The analysis core imports no platform or framework code

Source under `packages/analysis` SHALL import only the language's standard library, its own modules (with explicit `.ts` extensions, and only erasable TypeScript syntax, so plain Node can run it) and `zod`. An import of a framework (`react`, `next`), a service SDK (`@supabase/*`, `ai`, `@ai-sdk/*`) or a Node built-in SHALL fail lint, and a reference to a DOM or Node global SHALL fail type checking.

#### Scenario: The core imports react

- **WHEN** a file under `packages/analysis/src` imports `react`
- **THEN** lint fails on that import

#### Scenario: The core references a DOM global

- **WHEN** a file under `packages/analysis/src` reads `window`
- **THEN** type checking fails on that reference

#### Scenario: The core imports a Node built-in

- **WHEN** a file under `packages/analysis/src` imports `fs` or `node:fs`
- **THEN** lint fails on that import

### Requirement: The analysis core runs in plain Node

The core SHALL load and run in a plain Node process with no bundler, framework or DOM, so the same code serves a browser, a server route and a test.

#### Scenario: Loading the core outside the app

- **WHEN** plain `node` imports `packages/analysis/src/index.ts`
- **THEN** it loads without error

### Requirement: The core's only runtime dependency is zod

`packages/analysis/package.json` SHALL list no runtime dependency other than `zod`.

#### Scenario: A dependency is added to the core

- **WHEN** a runtime dependency other than `zod` is added to the core's manifest
- **THEN** the unit suite fails, naming it

### Requirement: Apps do not import each other

An app under `apps/` SHALL import shared code only from a package under `packages/`, never from another app.

**Unenforced:** there is one app until Phase 2; pnpm's strict resolution already refuses an undeclared workspace import. Add a lint rule when a second app lands.

#### Scenario: A second app needs shared code

- **WHEN** a new app needs code that lives in `apps/web`
- **THEN** that code moves to a package under `packages/` first
