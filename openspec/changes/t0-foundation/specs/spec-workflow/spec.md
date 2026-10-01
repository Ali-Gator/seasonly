# Spec Workflow Specification

## Purpose

Defines how a spec is found for a given source file, what blocks an implementation edit that has no spec, what makes a planned change valid enough to gate on, and how finishing a change updates the specs it touched.

## ADDED Requirements

### Requirement: Specs live under the OpenSpec root

Every spec SHALL live at `openspec/specs/<capability>/spec.md`, one directory per
capability, named in kebab-case. The spec-to-source mapping table SHALL live at
`openspec/specs/README.md`, which the OpenSpec CLI ignores when listing or validating
capabilities.

#### Scenario: Locating the spec for a source file

- **WHEN** a contributor needs the spec covering `packages/analysis/src/classifier.ts`
- **THEN** the mapping table row whose glob matches that path names the capability, and
  the spec is at `openspec/specs/<that-capability>/spec.md`

#### Scenario: Mapping table is not mistaken for a capability

- **WHEN** the capability inventory is listed
- **THEN** `openspec/specs/README.md` does not appear as a capability

### Requirement: An implementation edit without its spec is blocked

An edit to a source path covered by the mapping table SHALL be refused when that path's
spec file does not exist. A source path no table row matches SHALL be allowed, and the
exemption list (tests, docs and markdown, config files, UI primitives, global styles,
scripts and hooks, static assets, data and stylesheet files, agent configuration, env
files) SHALL apply in every workspace package.

The gate SHALL refuse an edit only when it can read the target path from the tool call.
It reads paths given directly, and reads them out of a shell command for the write shapes
it recognises; a path it cannot read SHALL be allowed rather than guessed at, and the
recognised shapes SHALL stay pinned by test. Coverage is therefore high but not total, and
routing an edit around the gate is not approval to skip the spec.

#### Scenario: Mapped path with a missing spec

- **WHEN** an edit targets a source path whose mapping row names a spec that does not exist
- **THEN** the edit is refused and the message names the spec to create and its path under
  `openspec/specs/`

#### Scenario: Mapped path with an existing spec

- **WHEN** an edit targets a source path whose mapped spec exists
- **THEN** the edit proceeds

#### Scenario: Write target the gate cannot read

- **WHEN** a shell command writes to a mapped path through a shape the gate does not
  recognise, such as a path built from a variable or a copy
- **THEN** the edit is allowed, and that shape is recorded in the gate's pinning test as a
  known gap rather than treated as enforced

### Requirement: A planned change is machine-validated at the phase boundary

A change SHALL be validated by a command that exits non-zero when the change is
incomplete, and that validation SHALL run at the phase boundary — in CI and before a
change is archived. It SHALL NOT run in the pre-commit gate, because a change that has
been scaffolded but not yet fully planned is a valid intermediate state that must remain
committable.

**Unenforced:** this is behavior of the OpenSpec CLI (`openspec validate`, `openspec archive`) and of the CI workflow that runs it, not of repository code; no test here can prove a third-party tool's behavior, and CI going red is the check.

#### Scenario: Incomplete change reaches CI

- **WHEN** a change declares a requirement carrying no scenario, or declares no spec delta
  and has not opted out of specs
- **THEN** validation fails and reports which requirement or delta is missing

#### Scenario: Half-planned change is committed

- **WHEN** a change has been scaffolded and carries a proposal but no spec delta yet
- **THEN** committing it succeeds

#### Scenario: Unconverted specs do not block the gate

- **WHEN** capabilities exist that have no requirements yet
- **THEN** change validation still passes, and those capabilities are reported with a
  requirement count of zero

### Requirement: A change with no behavior change opts out explicitly

A change that alters no spec-level behavior SHALL declare that opt-out in its own
metadata rather than inventing a requirement to satisfy validation. The kinds that
qualify SHALL match the existing no-spec-needed exceptions: config files, UI primitives,
global styles, scripts and hooks, documentation, and static assets.

**Unenforced:** this is behavior of the OpenSpec CLI (`openspec validate`, `openspec archive`) and of the CI workflow that runs it, not of repository code; no test here can prove a third-party tool's behavior, and CI going red is the check.

#### Scenario: Tooling-only change

- **WHEN** a change touches only configuration and documentation
- **THEN** it declares the specs opt-out, validation passes, and no spec delta is written

### Requirement: Finishing a change updates the specs it touched

Archiving a completed change SHALL apply its spec deltas to the affected capabilities and
SHALL refuse to apply a partial or mismatched delta, leaving the specs untouched when it
refuses. Sections of a spec outside the requirement blocks named by the delta SHALL be
preserved byte-for-byte.

**Unenforced:** this is behavior of the OpenSpec CLI (`openspec validate`, `openspec archive`) and of the CI workflow that runs it, not of repository code; no test here can prove a third-party tool's behavior, and CI going red is the check.

#### Scenario: Delta targets a requirement that does not exist

- **WHEN** a change modifies a requirement whose heading is absent from the capability's spec
- **THEN** archiving aborts, reports the heading it could not find, and changes no files

#### Scenario: Surrounding spec content survives

- **WHEN** a delta modifies one requirement in a spec that also carries interface,
  behavior and edge-case sections
- **THEN** only that requirement block changes and the other sections are unchanged

### Requirement: Specs carry requirements alongside their existing content

A spec file SHALL keep its feature heading, cross-references, public interface, behavior
notes and edge cases, and SHALL additionally carry a requirements section of requirement
and scenario blocks. A capability SHALL gain its requirements section when a change first
touches it, not as a precondition for the migration.

**Unenforced:** an authoring convention for spec files; `openspec validate` checks the requirement blocks and review checks the rest.

#### Scenario: Capability touched for the first time

- **WHEN** a change modifies a capability whose spec has no requirements yet
- **THEN** that change adds the requirements section as new requirements rather than as
  modifications to absent ones

#### Scenario: Spec keeps its interface documentation

- **WHEN** a spec documenting exported signatures is validated
- **THEN** validation passes with those sections present

### Requirement: Citations are gated at every commit

The citation checks the constitution requires — every anchored citation resolves, and every requirement is proven by a citing test or marked unenforced — SHALL run in the unit test suite, and therefore in the pre-commit gate, and SHALL also run in the CI workflow that validates OpenSpec changes, so a commit made outside the agent's hook is gated too. They SHALL scan the source and test files under `apps/`, `packages/`, `scripts/`, `e2e/` and `evals/`, and SHALL count end-to-end specs as tests, since several requirements are proven only in the browser. A failure SHALL name every offending citation by file and line and every unproven requirement by capability and name, not only the first.

A citation SHALL also resolve against a requirement or scenario that an unarchived change adds or renames under `openspec/changes/<change>/specs/<capability>/spec.md`, so a test written before its change is archived can already cite the permanent spec path. Only archived requirements SHALL be subject to the proven-by-a-test check.

#### Scenario: A commit with a stale citation

- **WHEN** a commit is attempted while a citation points at an anchor that no longer exists
- **THEN** the pre-commit gate blocks it and lists each stale citation with its file and line

#### Scenario: A test written during an unarchived change

- **WHEN** a test cites a requirement that exists only as an addition in an unarchived change
- **THEN** the citation resolves and the commit is allowed

#### Scenario: Archiving a requirement nobody tests

- **WHEN** a change is archived and one of the requirements it adds is neither cited by a test nor marked unenforced
- **THEN** the next commit is blocked, naming that requirement

#### Scenario: Existing file-level links

- **WHEN** a file carries a file-level `@see openspec/specs/<capability>/spec.md` link
- **THEN** the gate does not require it to be converted to an anchored citation, and fails only when the spec file it names does not exist

### Requirement: Mapping rows never overlap

Each source path SHALL be owned by at most one row of the mapping table, and every row
SHALL match at least one file in the repository, so a row never reads as coverage it does
not provide and no path depends on row order.

#### Scenario: Two rows claim one file

- **WHEN** a file in the repository matches globs in two rows of the mapping table
- **THEN** the unit suite fails, naming the file and both capabilities

#### Scenario: A row that matches nothing

- **WHEN** a row's globs match no file in the repository
- **THEN** the unit suite fails, naming the capability

### Requirement: Every agent commit passes the fast gates

A `git commit` run by an agent SHALL be refused unless formatting, lint, type checking and
the unit suite all pass. The unit suite SHALL run whenever any workspace root (`apps/`,
`packages/`, `scripts/`) holds a test file, and a failure of the gate itself SHALL never
read as success.

#### Scenario: A failing unit test

- **WHEN** an agent commits while a unit test fails
- **THEN** the commit is refused with exit code 2

#### Scenario: Tests outside the app

- **WHEN** the only test files live under `packages/`
- **THEN** the gate still runs the unit suite

### Requirement: A change is tied to its Tracker row

A change SHALL be named `t<N>-<slug>`, where `T<N>` is its row in the Tracker tab of the
concept doc. Archiving the change SHALL set that row's status and add one line to the
Tracker log.

#### Scenario: A change without a Tracker ID

- **WHEN** a change directory under `openspec/changes/` is not named `t<N>-<slug>`
- **THEN** the unit suite fails, naming the directory
