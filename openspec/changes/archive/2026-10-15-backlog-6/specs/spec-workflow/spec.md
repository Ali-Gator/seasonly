## MODIFIED Requirements

### Requirement: Citations are gated at every commit

The citation checks the constitution requires — every anchored citation resolves, and every requirement is proven by a citing test or marked unenforced — SHALL run in the unit test suite, and therefore in the pre-commit gate, and SHALL also run in CI (`ci.yml`) on every push, so a commit made outside the agent's hook is gated too. They SHALL scan the source and test files under `apps/`, `packages/`, `scripts/`, `e2e/` and `evals/`, and SHALL count end-to-end specs as tests, since several requirements are proven only in the browser. A failure SHALL name every offending citation by file and line and every unproven requirement by capability and name, not only the first.

A citation SHALL also resolve against a requirement or scenario that an unarchived change adds, modifies or renames under `openspec/changes/<change>/specs/<capability>/spec.md` — a modified one only when its requirement exists in the permanent spec or is renamed to in the same delta, since archive refuses any other — so a test written before its change is archived can already cite the permanent spec path. Only archived requirements SHALL be subject to the proven-by-a-test check, and an unarchived change's delta SHALL apply to that check as it applies to citations: a requirement the change removes, or renames to another name, SHALL no longer need a citing test, and a requirement the change modifies SHALL count as proven when a test cites a scenario the delta adds to it.

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

#### Scenario: A requirement an unarchived change removes or renames

- **WHEN** an unarchived change removes a requirement, or renames it, and no test cites the old requirement any more
- **THEN** the proof check does not report the old requirement and the commit is allowed

#### Scenario: A modified requirement proven only through its new scenario

- **WHEN** an unarchived change adds a scenario to an existing requirement, and the only test citing that requirement cites the new scenario
- **THEN** the proof check counts the requirement as proven and the commit is allowed
