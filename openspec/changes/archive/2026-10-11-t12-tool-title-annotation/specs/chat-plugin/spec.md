## MODIFIED Requirements

### Requirement: The tool is annotated read-only

The tool SHALL carry the annotations `readOnlyHint: true`, `destructiveHint: false` and `openWorldHint: false`, each set explicitly, and the annotation `title`, equal to the tool's top-level title. Its description SHALL say what the tool does and what each of the four answers means. The description SHALL NOT tell the model how to behave, SHALL NOT tell it to call other tools, and SHALL NOT promote Seasonly or any other product.

**Unenforced:** whether a description instructs the model or promotes a product is a semantic judgment. The phase review checks it, and so do both stores' reviews.

#### Scenario: The annotations

- **WHEN** the tools are listed
- **THEN** the tool's annotations are `readOnlyHint: true`, `destructiveHint: false` and `openWorldHint: false`

#### Scenario: The title annotation

- **WHEN** the tools are listed
- **THEN** the tool's `annotations.title` is set and equals its top-level `title`
