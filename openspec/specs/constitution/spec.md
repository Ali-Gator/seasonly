# Constitution Specification

## Purpose

The governing principles: where truth about the system's behavior lives, how code and tests cite it, how it is proven, and the engineering discipline every change is held to. Every other capability is subordinate to this one.

## Public Interface

No code. The citation form code and tests use:

```typescript
/** {@link openspec/specs/<capability>/spec.md#<requirement-or-scenario-anchor>} */
```

The gate is `scripts/__tests__/spec-citations.test.ts`; `spec-workflow` says where it runs.

## Behavior

An anchor is the GitHub heading slug of a `### Requirement:` or `#### Scenario:` heading:
lowercase, every character other than a letter, digit, space, hyphen or underscore dropped,
spaces turned into hyphens. File-level `@see` links stay valid; prefer anchored citations.

## Edge Cases

- Two requirements or scenarios with the same name in one capability: the gate fails rather
  than guess which anchor a citation means.
- A heading-like line inside a fenced code block is not a heading.
- A requirement cited only through one of its scenarios counts as proven.

## Requirements

### Requirement: Specifications are cited, never restated

The capability specifications under `openspec/specs/` SHALL be the single source of truth for how the system behaves. Code, tests, memory and narrative documents SHALL cite the requirement that governs them and SHALL NOT restate its rule; they keep only the local reason the rule does not capture.

**Unenforced:** whether a comment restates a rule rather than citing it is a semantic judgment no mechanical check can make; code review catches it.

#### Scenario: Code invokes a rule

- **WHEN** code or a document relies on a rule that a capability states
- **THEN** it cites that capability's requirement and keeps only the local reason

### Requirement: A citation is an anchored link that resolves

A citation SHALL be a JSDoc inline link of the form `{@link openspec/specs/<capability>/spec.md#<anchor>}`, addressed from the repository root, where the anchor is the heading anchor of a requirement or a scenario in that capability. A citation SHALL sit on the declaration the requirement governs — a function, a class member, a test block, a configuration entry — inside a `/** */` block where it documents a declaration, and in a `//` line comment where JSDoc cannot attach. Code SHALL cite requirements; tests SHALL cite the scenario they prove, or the requirement when no scenario fits. A citation that does not resolve SHALL fail the build.

#### Scenario: A cited requirement is renamed

- **WHEN** a requirement or scenario heading is renamed or removed while code still cites its old anchor
- **THEN** the citation no longer resolves and the build fails, naming the file and line of the stale citation

#### Scenario: A cited capability does not exist

- **WHEN** a citation names a capability with no spec file
- **THEN** the build fails, naming the file and line of the citation

#### Scenario: A file-level link

- **WHEN** a comment carries a link to a spec file without an anchor
- **THEN** it resolves when the spec file exists, and fails the build otherwise

### Requirement: Every requirement is proven by a test that cites it

Every requirement in every capability specification SHALL be cited by at least one test, either directly or through one of its own scenarios. A requirement that no test can prove SHALL say so in its own body with a `**Unenforced:**` line giving the reason; such a requirement is exempt from this check. A requirement with neither a citing test nor that line SHALL fail the build.

#### Scenario: A requirement with no citing test

- **WHEN** a requirement is neither cited by any test, nor through any of its scenarios, nor marked unenforced
- **THEN** the build fails, naming the capability and the requirement

#### Scenario: A test cites a scenario

- **WHEN** a test cites a scenario and nothing cites the scenario's requirement directly
- **THEN** the requirement counts as proven

#### Scenario: Only code cites a requirement

- **WHEN** a requirement is cited by code but by no test
- **THEN** the build fails, because a code citation shows where a rule is implemented, not that it holds

#### Scenario: An unenforceable requirement

- **WHEN** a requirement carries a `**Unenforced:**` line with a reason
- **THEN** no test citation is required for it

### Requirement: Narrative documents carry no rules

A rule-like statement — must, never, always, an invariant — SHALL live in a capability specification. A document under `docs/`, or a memory file, that states one SHALL have it lifted into the owning capability and replaced by a citation.

**Unenforced:** recognizing a rule in prose is a semantic judgment; review catches it.

#### Scenario: A rule found in a narrative document

- **WHEN** a rule-like statement appears in a narrative document
- **THEN** it moves into the owning capability and the document cites it

### Requirement: A failing test is fixed in the code

When a test fails, the code SHALL be changed to satisfy it. A test SHALL be changed only when it misreads its specification, and only after the user approves the change with the reason stated.

**Unenforced:** the intent behind an edit to a test is not visible to a mechanical check; review catches it.

#### Scenario: A test fails after a code change

- **WHEN** a test that cites a requirement fails
- **THEN** the code is fixed, unless the user approves a stated reason that the test misreads the requirement

### Requirement: The repository has one language

Everything written into the repository — code, comments, specifications, documents, commit messages and pull request descriptions — SHALL be in English.

**Unenforced:** language detection over free text is not worth its false positives; review catches it.

#### Scenario: A non-English conversation

- **WHEN** the conversation that produces a change is not in English
- **THEN** everything the change writes into the repository is still English

### Requirement: The simplest design that works, one mechanism per concern

A change SHALL use the simplest design that meets its requirements, reusing a mechanism the repository already has before adding one. A concern SHALL be served by one mechanism; a second mechanism for the same concern SHALL replace the first in the same change, not sit beside it.

**Unenforced:** simplicity and duplication of mechanism are design judgments; phase review catches them.

#### Scenario: A new mechanism for an existing concern

- **WHEN** a change introduces a mechanism for a concern the repository already serves
- **THEN** the same change removes the old mechanism, or reuses it instead
