## MODIFIED Requirements

### Requirement: Citations are gated at every commit

The citation checks the constitution requires — every anchored citation resolves, and every requirement is proven by a citing test or marked unenforced — SHALL run in the unit test suite, and therefore in the pre-commit gate, and SHALL also run in CI (`ci.yml`) on every push, so a commit made outside the agent's hook is gated too. They SHALL scan the source and test files under `apps/`, `packages/`, `scripts/`, `e2e/` and `evals/`, and SHALL count end-to-end specs as tests, since several requirements are proven only in the browser. A failure SHALL name every offending citation by file and line and every unproven requirement by capability and name, not only the first.

A citation SHALL also resolve against a requirement or scenario that an unarchived change adds, modifies or renames under `openspec/changes/<change>/specs/<capability>/spec.md` — a modified one only when its requirement exists in the permanent spec or is renamed to in the same delta, since archive refuses any other — so a test written before its change is archived can already cite the permanent spec path. Only archived requirements SHALL be subject to the proven-by-a-test check.

#### Scenario: A commit with a stale citation

- **WHEN** a commit is attempted while a citation points at an anchor that no longer exists
- **THEN** the pre-commit gate blocks it and lists each stale citation with its file and line

#### Scenario: A test written during an unarchived change

- **WHEN** a test cites a requirement that exists only as an addition in an unarchived change
- **THEN** the citation resolves and the commit is allowed

#### Scenario: A test citing a scenario a change adds to an existing requirement

- **WHEN** a test cites a scenario that exists only inside a modified requirement of an unarchived change
- **THEN** the citation resolves and the commit is allowed

#### Scenario: A modified requirement that matches nothing

- **WHEN** an unarchived change modifies a requirement the permanent spec does not have, and a test cites one of its scenarios
- **THEN** the citation does not resolve and the commit is blocked

#### Scenario: Archiving a requirement nobody tests

- **WHEN** a change is archived and one of the requirements it adds is neither cited by a test nor marked unenforced
- **THEN** the next commit is blocked, naming that requirement

#### Scenario: Existing file-level links

- **WHEN** a file carries a file-level `@see openspec/specs/<capability>/spec.md` link
- **THEN** the gate does not require it to be converted to an anchored citation, and fails only when the spec file it names does not exist

### Requirement: A change is tied to its Tracker row

A change SHALL be named `t<N>-<slug>`, where `T<N>` is its row in the Tracker tab of the
concept doc, or `backlog-<n>` with an optional `-<slug>`, where `<n>` numbers a batch of
fixes from `docs/backlog.md`. A backlog batch has no Tracker row; git and its archived change
record what it shipped.

#### Scenario: A change without a Tracker ID

- **WHEN** a change directory under `openspec/changes/` is named neither `t<N>-<slug>` nor `backlog-<n>[-<slug>]`
- **THEN** the unit suite fails, naming the directory

#### Scenario: A backlog batch

- **WHEN** a change directory is named `backlog-3` or `backlog-3-photo-upload`
- **THEN** the change-name check accepts it

### Requirement: Archiving a change updates the Tracker

Archiving a `t<N>` change SHALL set its Tracker row's status and add one line to the Tracker
log. Archiving a `backlog-<n>` change SHALL NOT touch the Tracker.

**Unenforced:** the Tracker is a doc outside the repository; the archive skill carries the step and the phase review checks it.

#### Scenario: A change is archived

- **WHEN** `t4-analysis-core` is archived
- **THEN** row T4's status is updated and the log gains a line for it

#### Scenario: A backlog batch is archived

- **WHEN** `backlog-3` is archived
- **THEN** the Tracker is not edited
