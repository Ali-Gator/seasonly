## MODIFIED Requirements

### Requirement: Citations are gated at every commit

The citation checks the constitution requires — every anchored citation resolves, and every requirement is proven by a citing test or marked unenforced — SHALL run in the unit test suite, and therefore in the pre-commit gate, and SHALL also run in CI (`ci.yml`) on every push, so a commit made outside the agent's hook is gated too. They SHALL scan the source and test files under `apps/`, `packages/`, `scripts/`, `e2e/` and `evals/`, and SHALL count end-to-end specs as tests, since several requirements are proven only in the browser. A failure SHALL name every offending citation by file and line and every unproven requirement by capability and name, not only the first.

A citation SHALL also resolve against a requirement or scenario that an unarchived change adds, modifies or renames under `openspec/changes/<change>/specs/<capability>/spec.md` — a modified one only when its requirement exists in the permanent spec or is renamed to in the same delta, since archive refuses any other — so a test written before its change is archived can already cite the permanent spec path. Only archived requirements SHALL be subject to the proven-by-a-test check, and an unarchived change's delta SHALL apply to that check as it applies to citations: a requirement the change removes, or renames to another name, SHALL no longer need a citing test, a requirement the change modifies SHALL count as proven when a test cites a scenario the delta adds to it, and a requirement the change modifies and marks unenforced SHALL no longer need a citing test. A renamed requirement's new name SHALL be read whole, whatever characters it holds. A rename's old and new names SHALL be read in every spelling OpenSpec's archive accepts — with or without a list bullet, backticks around the heading, or extra spaces — and a line that is not a rename line SHALL NOT be read as one. A requirement SHALL count as marked unenforced only when a line of its own body starts with the flag; a sentence that merely names the flag SHALL NOT mark it. The permanent spec's requirements and scenarios SHALL be read from its `## Requirements` section only, as archive reads them: a requirement or scenario heading under any other section SHALL NOT be held as a name, resolve or need a citing test. A delta SHALL be read as OpenSpec's archive reads it. A rename's old name SHALL count as renamed only when a new-name line follows it in the same renamed section, and a new name with no old name before it SHALL NOT become citable. A section heading SHALL be matched trimmed and in any letter case, its whole title compared, and a requirement heading in any letter case. A line inside a code fence SHALL NOT be read as a heading or a rename line. A removed requirement's name SHALL be read in every spelling OpenSpec's archive accepts — as a requirement heading, or as one behind a list bullet, with or without backticks. A scenario heading SHALL be read with a space or tab after `####` and with `Scenario:` in any letter case, and its anchor SHALL be the slug of its text as GitHub renders it, any spaces, combining marks and connector punctuation inside kept and a closing `#` sequence dropped. A requirement heading's anchor SHALL likewise be the slug of its text as GitHub renders it, while its name stays as archive reads it; a requirement heading with no space or tab after `###` SHALL have no anchor, since GitHub renders no heading there, so no citation reaches it. Where a delta meets the permanent spec — a requirement it modifies, removes or renames — names SHALL be compared trimmed, whole and in their letter case, as archive compares them, never by anchor. Renames SHALL be taken in order, as archive applies them, each against the permanent spec's names with the earlier renames of the same delta applied; a rename whose old name does not exist at that point, or whose new name already does, SHALL make nothing citable that the permanent spec does not, and SHALL leave its old name needing a citing test. A rename archive aborts on SHALL make nothing citable or exempt for the names it touches: when its old name and its new name are both held at its turn, when its new name is held and its old name is not but a held name other than its new name matches the old name once letter case and spacing are folded, or when neither its old name nor its new name is held at its turn, the delta SHALL make nothing citable or exempt for its old name, its new name or any held name that matches the old name so folded, a block the delta adds or modifies under any of them SHALL NOT resolve, and every rename of the chain that ends at any of them SHALL count as not applied, the chain's first old name still needing a citing test. A rename's new name SHALL be citable only when the delta still holds it after all its renames and its removals, since archive applies renames before removals; a new name that a later rename of the same delta moves on, or that the delta removes, SHALL NOT become citable. A rename's old name SHALL count as renamed away only when the delta no longer holds it after all its renames, so a rename back to it, or a later rename onto it, leaves it needing a citing test. A permanent name that a later rename of the same delta moves another requirement onto SHALL be proven only through its own heading's anchor or the moved requirement's scenarios, and SHALL count as marked unenforced only when the moved requirement is, since archive writes the moved block under that name; the permanent block's own scenarios SHALL NOT prove it, though their anchors still resolve under the name that block was renamed to. A delta whose sections conflict in a way archive's pre-validate refuses SHALL make nothing the conflict names citable or exempt: a requirement it both modifies and removes, or both modifies and renames away from, together with that rename's new name; a name it both adds and modifies; an added name that is also a rename's new name; a rename whose old name a removed name matches with letter case and spacing folded; every rename that repeats an old or new name; a name it both adds and removes; and a name repeated within its added, modified or removed section. Removals SHALL be taken in order after the renames, each against the names held at that point, as archive applies them; a removed name not held exactly at its turn that matches a held name once letter case and spacing are folded makes archive abort, so the delta SHALL make nothing citable or exempt for either name: every rename of the chain that ends at the held name SHALL count as not applied, the chain's first old name still needing a citing test, and a block the delta adds or modifies under either name SHALL NOT resolve. An added requirement whose name the permanent spec still holds, after the delta's renames are applied, SHALL make nothing citable that the permanent spec does not, since archive refuses it unless its block is identical to the permanent one. A requirement an unarchived change modifies, where archive accepts the modification, SHALL resolve and be proven through the delta's own requirement and scenario headings in place of the permanent ones, since archive writes the delta's block over the permanent block: the permanent requirement's anchor and its scenarios' anchors SHALL NOT resolve unless the delta's headings give the same anchors, the requirement SHALL count as proven only when a delta heading for it has an anchor, and it SHALL count as marked unenforced only when the delta's block is. A requirement a change renames and then modifies SHALL be citable by the anchor of the delta's modified heading, not by the plain slug of its new name. When several unarchived changes modify one requirement, the headings of every one of them SHALL count.

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

#### Scenario: A test citing a new name that holds a code span

- **WHEN** an unarchived change renames a requirement to a name containing backtick-quoted text, and a test cites the new name
- **THEN** the citation resolves and the commit is allowed

#### Scenario: A requirement an unarchived change marks unenforced

- **WHEN** an unarchived change modifies a requirement to mark it unenforced, and no test cites that requirement
- **THEN** the proof check does not report it and the commit is allowed

#### Scenario: A requirement whose prose only names the flag

- **WHEN** a requirement's body mentions the unenforced flag inside a sentence, no line of its body starts with the flag, and no test cites it
- **THEN** the proof check reports it as unproven

#### Scenario: A rename written in another spelling OpenSpec accepts

- **WHEN** an unarchived change renames a requirement with rename lines written without backticks, with extra spaces, or with another list bullet, and a test cites the new name
- **THEN** the citation resolves, the old requirement needs no citing test, and the commit is allowed

#### Scenario: A rename line with no partner

- **WHEN** an unarchived change's renamed section names an old requirement with no new-name line after it, and no test cites that requirement
- **THEN** the proof check reports it as unproven

#### Scenario: A delta section heading in another letter case

- **WHEN** an unarchived change writes its renamed section's heading in another letter case, and a test cites the new name
- **THEN** the citation resolves and the commit is allowed

#### Scenario: A rename example inside a code fence

- **WHEN** an unarchived change's renamed section shows a rename inside a code fence, and no test cites the requirement it names
- **THEN** the proof check reports it as unproven

#### Scenario: A removal written as a list bullet

- **WHEN** an unarchived change's removed section lists a requirement as a heading behind a list bullet, with or without backticks, and no test cites that requirement
- **THEN** the proof check does not report it and the commit is allowed

#### Scenario: A scenario heading in another letter case

- **WHEN** a spec or an unarchived change writes a scenario heading with `scenario:` in lower case or with extra spaces after `####`, and a test cites the slug of that heading
- **THEN** the citation resolves and the commit is allowed

#### Scenario: A delta name that differs from the permanent one only in case or punctuation

- **WHEN** an unarchived change removes, renames or modifies a requirement under a name that differs from the permanent requirement's only in letter case or punctuation, and no test cites the permanent requirement
- **THEN** the proof check reports the permanent requirement as unproven, and neither the scenarios of a requirement modified under that name nor the new name of a rename from that name resolve

#### Scenario: A requirement heading GitHub anchors with its spaces kept

- **WHEN** a spec or an unarchived change writes a requirement heading with two spaces inside its name, or with a closing `#` sequence, and a test cites the slug of that heading as GitHub renders it
- **THEN** the citation resolves, and a citation of the slug with the inner spaces folded into one does not

#### Scenario: A requirement heading with no space after its marker

- **WHEN** a spec writes a requirement heading with no space between `###` and `Requirement:`, and a test cites the slug of that line
- **THEN** the citation does not resolve, and the proof check reports the requirement as unproven

#### Scenario: A rename whose old name matches nothing

- **WHEN** an unarchived change renames a requirement that neither the permanent spec nor an earlier rename in the same delta holds, and a test cites the new name
- **THEN** the citation does not resolve and the commit is blocked

#### Scenario: A chain of renames in one delta

- **WHEN** an unarchived change renames a requirement and then renames its new name again, and a test cites the last name while no test cites the permanent requirement
- **THEN** the citation resolves, the proof check does not report the permanent requirement, and the commit is allowed

#### Scenario: A rename onto a name the permanent spec already holds

- **WHEN** an unarchived change renames a permanent requirement to the name of another permanent requirement, and no test cites the renamed one
- **THEN** the proof check reports the renamed requirement as unproven

#### Scenario: A requirement modified and also removed or renamed away

- **WHEN** an unarchived change modifies a requirement that the same delta also removes, or also renames away from, tests cite the modified requirement's scenarios and the rename's new name, and no test cites the permanent requirement
- **THEN** none of those citations resolves and the proof check reports the permanent requirement as unproven

#### Scenario: Delta names archive's pre-validate refuses

- **WHEN** an unarchived change adds and modifies the same name, adds a rename's new name, renames a requirement it also removes, or repeats a name within one section, and tests cite the names involved while no test cites the permanent requirements they touch
- **THEN** none of those citations resolves and the proof check reports each of those permanent requirements as unproven

#### Scenario: A name added and removed in one delta

- **WHEN** an unarchived change adds and removes the same name, tests cite the added block's anchors, and no test cites the permanent requirement of that name
- **THEN** none of those citations resolves and the proof check reports that permanent requirement as unproven

#### Scenario: A rename's new name the same delta moves on or removes

- **WHEN** an unarchived change renames a requirement and then renames its new name again, or renames a requirement and removes its new name, and a test cites that intermediate or removed new name
- **THEN** the citation does not resolve and the commit is blocked

#### Scenario: An added name the permanent spec already holds

- **WHEN** an unarchived change adds a requirement under a name the permanent spec holds, with a block that differs from the permanent one, and a test cites a scenario only that added block has
- **THEN** the citation does not resolve and the commit is blocked

#### Scenario: An added name a rename of the same delta frees

- **WHEN** an unarchived change renames a permanent requirement away and adds a new requirement under its old name, and a test cites a scenario of the added requirement
- **THEN** the citation resolves and the commit is allowed

#### Scenario: A modified requirement whose heading archive rewrites

- **WHEN** an unarchived change modifies a requirement under a heading archive matches to the permanent one but GitHub anchors differently, and a test cites the permanent requirement's anchor
- **THEN** the citation does not resolve and the commit is blocked

#### Scenario: A requirement heading with no space that a change fixes

- **WHEN** the permanent spec writes a requirement heading with no space after `###`, an unarchived change modifies it under a heading with the space and adds a scenario, and a test cites that scenario
- **THEN** the proof check counts the requirement as proven and the commit is allowed

#### Scenario: A scenario heading archive keeps under another anchor

- **WHEN** an unarchived change modifies a requirement and rewrites one of its scenario headings in a spelling archive reads as the same scenario but GitHub anchors differently, such as without `Scenario:` or with other spacing after it, and a test cites the permanent scenario's anchor
- **THEN** the citation does not resolve and the commit is blocked

#### Scenario: A modified requirement that drops its unenforced flag

- **WHEN** the permanent spec marks a requirement unenforced, an unarchived change modifies it without the flag, and no test cites it
- **THEN** the proof check reports it as unproven

#### Scenario: A renamed requirement modified under another spelling

- **WHEN** an unarchived change renames a requirement and modifies the new name under a heading GitHub anchors differently from the plain new name, and a test cites the plain new name's anchor
- **THEN** the citation does not resolve and the commit is blocked

#### Scenario: Two changes modifying one requirement

- **WHEN** two unarchived changes modify the same requirement under differently anchored headings, and a test cites either heading
- **THEN** the citation resolves and the commit is allowed

#### Scenario: A rename round trip in one delta

- **WHEN** an unarchived change renames a requirement and a later rename of the same delta gives it back its name, or moves another requirement onto that name, and no test cites it, and the requirement now under that name is not marked unenforced
- **THEN** the proof check reports that requirement as unproven

#### Scenario: A removal archive aborts on as a near-miss

- **WHEN** an unarchived change removes a name it does not hold that matches, once letter case and spacing are folded, a rename's new name or a requirement it modifies, tests cite that new name or the modified block's scenarios, and no test cites the permanent requirement
- **THEN** none of those citations resolves and the proof check reports the permanent requirement as unproven

#### Scenario: A rename onto a name the same delta frees

- **WHEN** an unarchived change renames a permanent requirement A to B and a later rename of the same delta moves another permanent requirement C onto A, and a test cites only one of A's permanent scenarios
- **THEN** that citation resolves, the proof check reports A as unproven, and a test citing one of C's permanent scenarios proves A instead

#### Scenario: A rename archive aborts on

- **WHEN** an unarchived change renames a requirement onto a name the permanent spec already holds, or renames a name it does not hold onto a held name while another held name matches the old name once letter case and spacing are folded, and modifies that held name with a new scenario that a test cites, while no test cites the permanent requirements involved
- **THEN** the citation does not resolve and the proof check reports each of those permanent requirements as unproven

#### Scenario: A rename archive aborts on with neither name held

- **WHEN** an unarchived change renames a name it does not hold onto a name it does not hold, while a held name matches the old name once letter case and spacing are folded, or while a later rename of the same delta moves a held requirement onto that old name, and a test cites a new scenario of that held name or the later rename's new name, while no test cites the permanent requirements involved
- **THEN** the citation does not resolve and the proof check reports each of those permanent requirements as unproven

#### Scenario: A requirement heading outside the Requirements section

- **WHEN** a permanent spec writes a `### Requirement:` heading under a section other than `## Requirements`, and no test cites it
- **THEN** the proof check does not report it, and a citation of its anchor does not resolve

#### Scenario: A heading that holds a combining mark

- **WHEN** a spec writes a scenario heading holding a letter followed by a combining accent, and a test cites the slug GitHub renders for it, the mark kept
- **THEN** the citation resolves and the commit is allowed
