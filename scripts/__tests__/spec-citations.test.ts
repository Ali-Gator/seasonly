/**
 * Guard: spec citations resolve, and every requirement is proven by a test that cites it.
 *
 * Scans `apps/`, `packages/`, `scripts/`, `e2e/` and `evals/` for `{@link openspec/specs/<cap>/spec.md#<anchor>}`
 * and `@see openspec/specs/<cap>/spec.md` links. Anchors are GitHub heading slugs of a
 * `### Requirement:` or `#### Scenario:` heading. A citation resolves against the main
 * specs plus the ADDED/MODIFIED/RENAMED headings of unarchived changes; only main-spec
 * requirements must be proven, minus those an unarchived change removes, renames away
 * from or marks unenforced, and a modified one is also proven by a test citing a scenario
 * its delta adds.
 * A test is any file with `.test.` or `__tests__/` in its path, or anything under `e2e/`.
 *
 * Fixture citations below are built by concatenation so this file's own scan never
 * sees them as real links.
 *
 * @see openspec/specs/constitution/spec.md
 */
import fs from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "../..");
const SPECS_DIR = path.join(REPO_ROOT, "openspec/specs");
const CHANGES_DIR = path.join(REPO_ROOT, "openspec/changes");
const SCAN: [dir: string, ext: RegExp][] = [
  ["apps", /\.(ts|tsx)$/],
  ["packages", /\.(ts|tsx)$/],
  ["scripts", /\.(ts|sh|py)$/],
  ["e2e", /\.ts$/],
  ["evals", /\.ts$/],
  [".github", /\.ya?ml$/],
];
// Single files that cite specs outside the scanned roots. They count as code, not tests.
const SCAN_FILES = ["eslint.config.mjs", "CLAUDE.md", "openspec/specs/README.md"];

// The capability segment is strict on purpose: it rejects shell interpolation
// (`$spec`) and lets a sentence-final period end a file-level link. The anchor is
// captured loosely so a malformed one reports as stale instead of passing as a
// file-level link.
const CITATION = /(?:\{@link |@see )openspec\/specs\/([a-z0-9-]+)\/spec\.md(?:#([^\s}]*))?/g;

interface Requirement {
  name: string;
  anchor: string;
  scenarios: string[];
  unenforced: boolean;
}

interface Citation {
  file: string;
  line: number;
  capability: string;
  anchor?: string;
}

/** GitHub heading slug: lowercase, drop all but letters/digits/space/hyphen/underscore, spaces to hyphens. */
function slugify(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .replace(/ /g, "-");
}

/**
 * Archive's `buildCodeFenceMask`: `true` for each line inside a fenced code block, the
 * opening and closing fence lines included. A fence opens on three or more backticks or
 * tildes after optional spaces, and closes on a line of only the same marker, at least as
 * long. An unclosed fence runs to the end.
 */
function fenceMask(lines: string[]): boolean[] {
  let open: string | undefined;
  return lines.map((line) => {
    if (open === undefined) {
      open = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
      return open !== undefined;
    }
    const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line)?.[1];
    if (close && close[0] === open[0] && close.length >= open.length) open = undefined;
    return true;
  });
}

/** `mask` is the lines' slice of the whole delta's fence mask, when they are one section's body. */
function parseRequirements(text: string, mask?: boolean[]): Requirement[] {
  const requirements: Requirement[] = [];
  let current: Requirement | undefined;
  const lines = text.split("\n");
  const masked = mask ?? fenceMask(lines);
  for (const [i, line] of lines.entries()) {
    if (masked[i]) continue;
    // Archive's `REQUIREMENT_HEADER_REGEX`: the keyword in any letter case.
    const req = /^###\s*Requirement:\s*(.+)\s*$/i.exec(line);
    const scenario = /^#### (Scenario: .+)$/.exec(line);
    if (req?.[1]) {
      const name = `Requirement: ${req[1].trim()}`;
      current = { name, anchor: slugify(name), scenarios: [], unenforced: false };
      requirements.push(current);
    } else if (/^#{1,3} /.test(line)) {
      current = undefined;
    } else if (current && scenario?.[1]) {
      current.scenarios.push(slugify(scenario[1]));
    } else if (current && line.startsWith("**Unenforced:**")) {
      current.unenforced = true;
    }
  }
  return requirements;
}

const renameLine = (keyword: "FROM" | "TO") =>
  new RegExp(
    `^[^\\S\\n]*[-*+]?[^\\S\\n]*${keyword}:[^\\S\\n]*\`?###[^\\S\\n]*Requirement:[^\\S\\n]*(.+?)\`?[^\\S\\n]*$`,
  );
const FROM_LINE = renameLine("FROM");
const TO_LINE = renameLine("TO");

/**
 * One RENAMED section's rename pairs as anchors, read in OpenSpec's archive shape
 * (`parseRenamedPairs`): start of line, optional `-`/`*`/`+` bullet, optional backticks, spaces
 * that never cross a line. A `FROM:` line sets the pending old name; a `TO:` line pairs with it
 * only when one is pending, so a line with no partner yields nothing.
 */
function renamedPairs(body: string[], mask: boolean[]): { from: string; to: string }[] {
  const pairs: { from: string; to: string }[] = [];
  let from: string | undefined;
  for (const [i, line] of body.entries()) {
    if (mask[i]) continue;
    const f = FROM_LINE.exec(line);
    const t = f ? null : TO_LINE.exec(line);
    if (f?.[1]) {
      from = slugify(`Requirement: ${f[1]}`);
    } else if (t?.[1] && from) {
      pairs.push({ from, to: slugify(`Requirement: ${t[1]}`) });
      from = undefined;
    }
  }
  return pairs;
}

const SECTION_KINDS = ["added", "modified", "removed", "renamed"] as const;

/**
 * A delta's `## ` sections in document order, as archive splits them (`splitTopLevelSections`)
 * and looks them up (`getSectionsCaseInsensitive`): the title trimmed, lowercased and compared
 * whole to `<kind> requirements`. Any other title is a section of no kind that still ends the
 * one before it. Repeated headings stay separate bodies. The fence mask is built once for the
 * whole delta and each body carries its slice, so a fenced `## ` line opens no section.
 */
function deltaSections(
  text: string,
): { kind?: (typeof SECTION_KINDS)[number]; body: string[]; mask: boolean[] }[] {
  const sections: ReturnType<typeof deltaSections> = [];
  const lines = text.split("\n");
  const masked = fenceMask(lines);
  lines.forEach((line, i) => {
    const m = masked[i] ? null : /^##\s+(.+)$/.exec(line);
    if (m) {
      const title = (m[1] ?? "").trim().toLowerCase();
      const kind = SECTION_KINDS.find((k) => title === `${k} requirements`);
      sections.push({ kind, body: [], mask: [] });
    } else {
      sections.at(-1)?.body.push(line);
      sections.at(-1)?.mask.push(masked[i] ?? false);
    }
  });
  return sections;
}

/**
 * Anchors a change delta makes citable before archive: its ADDED requirements and scenarios,
 * RENAMED targets, and MODIFIED requirements and scenarios — a MODIFIED one only when its
 * requirement already exists in the main spec (`existing`) or is renamed to in the same delta,
 * since archive refuses any other.
 */
function deltaAnchors(text: string, existing: ReadonlySet<string> = new Set()): string[] {
  const sections = deltaSections(text);
  const renamed = sections
    .filter((s) => s.kind === "renamed")
    .flatMap((s) => renamedPairs(s.body, s.mask).map((p) => p.to));
  const anchors: string[] = [...renamed];
  for (const { kind, body, mask } of sections) {
    if (kind !== "added" && kind !== "modified") continue;
    for (const r of parseRequirements(body.join("\n"), mask)) {
      if (kind === "added" || existing.has(r.anchor) || renamed.includes(r.anchor)) {
        anchors.push(r.anchor, ...r.scenarios);
      }
    }
  }
  return anchors;
}

/** What open changes do to the proof check, per capability. */
interface OpenDelta {
  /** Requirements a delta removes, renames away from or marks unenforced: they need no citing test. */
  gone: Set<string>;
  /** Scenarios a delta adds to a modified requirement: citing one proves it. */
  scenarios: Map<string, string[]>;
}

/** Reads a change delta into `into`, so several changes to one capability accumulate. */
function deltaProof(
  text: string,
  into: OpenDelta = { gone: new Set(), scenarios: new Map() },
): OpenDelta {
  for (const { kind, body, mask } of deltaSections(text)) {
    if (kind === "removed") {
      for (const r of parseRequirements(body.join("\n"), mask)) into.gone.add(r.anchor);
    } else if (kind === "renamed") {
      for (const { from } of renamedPairs(body, mask)) into.gone.add(from);
    } else if (kind === "modified") {
      for (const r of parseRequirements(body.join("\n"), mask)) {
        if (r.unenforced) into.gone.add(r.anchor);
        into.scenarios.set(r.anchor, [...(into.scenarios.get(r.anchor) ?? []), ...r.scenarios]);
      }
    }
  }
  return into;
}

function extractCitations(file: string, text: string): Citation[] {
  const out: Citation[] = [];
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(CITATION)) {
      if (m[1]) out.push({ file, line: i + 1, capability: m[1], anchor: m[2] });
    }
  });
  return out;
}

function isTest(file: string): boolean {
  return file.includes(".test.") || file.includes("__tests__/") || file.startsWith("e2e/");
}

function staleCitations(citations: Citation[], known: Map<string, Set<string>>): string[] {
  return citations
    .filter((c) => {
      const anchors = known.get(c.capability);
      return !anchors || (c.anchor !== undefined && !anchors.has(c.anchor));
    })
    .map((c) => `${c.file}:${c.line} ${c.capability}${c.anchor ? `#${c.anchor}` : ""}`);
}

function unprovenRequirements(
  specs: Map<string, Requirement[]>,
  citations: Citation[],
  openChanges: Map<string, OpenDelta> = new Map(),
): string[] {
  const cited = new Set(
    citations.filter((c) => isTest(c.file) && c.anchor).map((c) => `${c.capability}#${c.anchor}`),
  );
  const out: string[] = [];
  for (const [capability, requirements] of specs) {
    const delta = openChanges.get(capability);
    for (const r of requirements) {
      if (delta?.gone.has(r.anchor)) continue;
      const anchors = [r.anchor, ...r.scenarios, ...(delta?.scenarios.get(r.anchor) ?? [])];
      const proven = anchors.some((a) => cited.has(`${capability}#${a}`));
      if (!proven && !r.unenforced) out.push(`${capability}: ${r.name}`);
    }
  }
  return out;
}

function duplicateHeadings(specs: Map<string, Requirement[]>): string[] {
  const out: string[] = [];
  for (const [capability, requirements] of specs) {
    const anchors = requirements.flatMap((r) => [r.anchor, ...r.scenarios]);
    for (const a of new Set(anchors.filter((a, i) => anchors.indexOf(a) !== i))) {
      out.push(`${capability}#${a}`);
    }
  }
  return out;
}

// --- the real repository ---

function walk(dir: string, ext: RegExp): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ["node_modules", ".next"].includes(entry.name) ? [] : walk(full, ext);
    }
    return ext.test(entry.name) ? [full] : [];
  });
}

function repoCitations(): Citation[] {
  const files = [
    ...SCAN.flatMap(([dir, ext]) => walk(path.join(REPO_ROOT, dir), ext)),
    ...SCAN_FILES.map((f) => path.join(REPO_ROOT, f)).filter(fs.existsSync),
  ];
  return files.flatMap((full) =>
    extractCitations(path.relative(REPO_ROOT, full), fs.readFileSync(full, "utf-8")),
  );
}

function mainSpecs(): Map<string, Requirement[]> {
  const specs = new Map<string, Requirement[]>();
  for (const cap of fs.readdirSync(SPECS_DIR)) {
    const file = path.join(SPECS_DIR, cap, "spec.md");
    if (fs.existsSync(file)) specs.set(cap, parseRequirements(fs.readFileSync(file, "utf-8")));
  }
  return specs;
}

/** Every unarchived change's delta specs, as capability and text. */
function openDeltas(): [cap: string, text: string][] {
  const out: [string, string][] = [];
  for (const change of fs.readdirSync(CHANGES_DIR)) {
    const deltas = path.join(CHANGES_DIR, change, "specs");
    if (change === "archive" || !fs.existsSync(deltas)) continue;
    for (const cap of fs.readdirSync(deltas)) {
      const file = path.join(deltas, cap, "spec.md");
      if (fs.existsSync(file)) out.push([cap, fs.readFileSync(file, "utf-8")]);
    }
  }
  return out;
}

function resolvableAnchors(specs: Map<string, Requirement[]>): Map<string, Set<string>> {
  const known = new Map<string, Set<string>>();
  for (const [cap, requirements] of specs) {
    known.set(cap, new Set(requirements.flatMap((r) => [r.anchor, ...r.scenarios])));
  }
  for (const [cap, text] of openDeltas()) {
    const main = new Set(specs.get(cap)?.flatMap((r) => r.anchor) ?? []);
    const anchors = known.get(cap) ?? new Set<string>();
    for (const a of deltaAnchors(text, main)) anchors.add(a);
    known.set(cap, anchors);
  }
  return known;
}

function openChanges(): Map<string, OpenDelta> {
  const out = new Map<string, OpenDelta>();
  for (const [cap, text] of openDeltas()) out.set(cap, deltaProof(text, out.get(cap)));
  return out;
}

describe("spec citations", () => {
  /**
   * {@link openspec/specs/constitution/spec.md#requirement-a-citation-is-an-anchored-link-that-resolves}
   * {@link openspec/specs/spec-workflow/spec.md#requirement-citations-are-gated-at-every-commit}
   */
  it("every citation under apps/, packages/, scripts/, e2e/ and evals/ resolves", () => {
    expect(staleCitations(repoCitations(), resolvableAnchors(mainSpecs()))).toEqual([]);
  });

  /**
   * {@link openspec/specs/constitution/spec.md#requirement-every-requirement-is-proven-by-a-test-that-cites-it}
   * {@link openspec/specs/spec-workflow/spec.md#scenario-archiving-a-requirement-nobody-tests}
   */
  it("every requirement is proven by a citing test or marked unenforced", () => {
    expect(unprovenRequirements(mainSpecs(), repoCitations(), openChanges())).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#requirement-specs-live-under-the-openspec-root} */
  it("openspec/specs holds only kebab-case capability directories, the mapping table and the template", () => {
    const strays = fs
      .readdirSync(SPECS_DIR)
      .filter(
        (entry) =>
          !entry.startsWith(".") &&
          !["README.md", "_template.md"].includes(entry) &&
          !(
            /^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry) &&
            fs.existsSync(path.join(SPECS_DIR, entry, "spec.md"))
          ),
      );
    expect(strays).toEqual([]);
  });

  it("no capability repeats a requirement or scenario name", () => {
    expect(duplicateHeadings(mainSpecs())).toEqual([]);
  });
});

describe("spec citation rules", () => {
  const SPEC = [
    "## Requirements",
    "",
    "### Requirement: `plan_shared` fires on a slug-mint, never: on open",
    "",
    "#### Scenario: Opening the dialog",
    "",
    "### Requirement: Nobody can test this",
    "",
    "```bash",
    "# a shell comment inside a fence, not a heading",
    "```",
    "",
    "**Unenforced:** a judgment call.",
    "",
    "### Requirement: Untested",
    "",
    "## Edge Cases",
    "",
    "**Unenforced:** prose after the section closes.",
  ].join("\n");
  const REQ = "requirement-plan_shared-fires-on-a-slug-mint-never-on-open";
  const SCENARIO = "scenario-opening-the-dialog";
  const cite = (cap: string, anchor?: string) =>
    "/** {@link openspec/specs/" + cap + "/spec.md" + (anchor ? "#" + anchor : "") + "} */";
  const specs = new Map([["cap", parseRequirements(SPEC)]]);
  const known = new Map([["cap", new Set([REQ, SCENARIO])]]);

  it("slugs keep letters, digits, hyphens and underscores, and drop backticks and colons", () => {
    expect(specs.get("cap")?.[0]?.anchor).toBe(REQ);
    expect(specs.get("cap")?.[0]?.scenarios).toEqual([SCENARIO]);
  });

  /** {@link openspec/specs/constitution/spec.md#scenario-a-test-cites-a-scenario} */
  it("a scenario citation from a test proves its parent requirement", () => {
    const citations = extractCitations("a.test.ts", cite("cap", SCENARIO));
    expect(unprovenRequirements(specs, citations)).toEqual(["cap: Requirement: Untested"]);
  });

  /**
   * {@link openspec/specs/constitution/spec.md#scenario-an-unenforceable-requirement}
   * {@link openspec/specs/constitution/spec.md#scenario-a-requirement-with-no-citing-test}
   */
  it("an unenforced requirement needs no citation; an uncited one is named", () => {
    expect(unprovenRequirements(specs, [])).toEqual([
      "cap: Requirement: `plan_shared` fires on a slug-mint, never: on open",
      "cap: Requirement: Untested",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-whose-prose-only-names-the-flag} */
  it("a requirement whose prose only names the unenforced flag still needs a citing test", () => {
    const prose = [
      "### Requirement: Names the flag",
      "",
      "A requirement nobody can test carries a `**Unenforced:**` line giving the reason.",
    ];
    const named = new Map([["cap", parseRequirements(prose.join("\n"))]]);
    expect(unprovenRequirements(named, [])).toEqual(["cap: Requirement: Names the flag"]);
  });

  /** {@link openspec/specs/constitution/spec.md#scenario-only-code-cites-a-requirement} */
  it("a citation from code does not prove a requirement", () => {
    const citations = extractCitations("apps/web/src/lib/a.ts", cite("cap", REQ));
    expect(unprovenRequirements(specs, citations)).toContain(
      "cap: Requirement: `plan_shared` fires on a slug-mint, never: on open",
    );
  });

  it("files under e2e/ and __tests__/ count as tests", () => {
    for (const file of ["e2e/a.spec.ts", "packages/x/src/__tests__/a.ts"]) {
      expect(unprovenRequirements(specs, extractCitations(file, cite("cap", REQ)))).toEqual([
        "cap: Requirement: Untested",
      ]);
    }
  });

  /**
   * {@link openspec/specs/constitution/spec.md#scenario-a-cited-requirement-is-renamed}
   * {@link openspec/specs/spec-workflow/spec.md#scenario-a-commit-with-a-stale-citation}
   */
  it("a stale anchor is reported with file and line", () => {
    const text = [
      "// ok",
      cite("cap", REQ),
      cite("cap", "requirement-gone"),
      cite("cap", "Scenario-Opening-the-dialog"),
    ].join("\n");
    expect(staleCitations(extractCitations("src/a.ts", text), known)).toEqual([
      "src/a.ts:3 cap#requirement-gone",
      "src/a.ts:4 cap#Scenario-Opening-the-dialog",
    ]);
  });

  /** {@link openspec/specs/constitution/spec.md#scenario-a-cited-capability-does-not-exist} */
  it("a citation of a missing capability is reported", () => {
    expect(staleCitations(extractCitations("src/a.ts", cite("nope", REQ)), known)).toEqual([
      `src/a.ts:1 nope#${REQ}`,
    ]);
  });

  /**
   * {@link openspec/specs/constitution/spec.md#scenario-a-file-level-link}
   * {@link openspec/specs/spec-workflow/spec.md#scenario-existing-file-level-links}
   */
  it("a file-level link resolves when the spec exists, including before a sentence-final period", () => {
    const text = ["@see openspec/specs/" + "cap/spec.md.", "@see openspec/specs/" + "nope/spec.md"];
    expect(staleCitations(extractCitations("src/a.ts", text.join("\n")), known)).toEqual([
      "src/a.ts:2 nope",
    ]);
  });

  it("shell interpolation is not a citation", () => {
    expect(extractCitations("scripts/a.sh", "# @see openspec/specs/" + "$spec/spec.md")).toEqual(
      [],
    );
  });

  /**
   * {@link openspec/specs/spec-workflow/spec.md#scenario-a-test-written-during-an-unarchived-change}
   * {@link openspec/specs/spec-workflow/spec.md#scenario-a-test-citing-a-scenario-a-change-adds-to-an-existing-requirement}
   */
  it("a change delta makes its ADDED, MODIFIED and RENAMED headings citable", () => {
    const delta = [
      "## ADDED Requirements",
      "### Requirement: New thing",
      "#### Scenario: It works",
      "## MODIFIED Requirements",
      "### Requirement: Old thing",
      "#### Scenario: It still works",
      "### Requirement: After",
      "#### Scenario: Renamed and changed",
      "## RENAMED Requirements",
      "- FROM: `### Requirement: Before`",
      "- TO: `### Requirement: After`",
    ].join("\n");
    expect(deltaAnchors(delta, new Set(["requirement-old-thing"]))).toEqual([
      "requirement-after",
      "requirement-new-thing",
      "scenario-it-works",
      "requirement-old-thing",
      "scenario-it-still-works",
      "requirement-after",
      "scenario-renamed-and-changed",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-modified-requirement-that-matches-nothing} */
  it("a MODIFIED requirement missing from the main spec makes nothing citable", () => {
    const delta = [
      "## MODIFIED Requirements",
      "### Requirement: Typo thing",
      "#### Scenario: Ghost",
    ];
    expect(deltaAnchors(delta.join("\n"), new Set(["requirement-old-thing"]))).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-test-citing-a-new-name-that-holds-a-code-span} */
  it("a RENAMED name that holds a code span is citable in full", () => {
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: Old flag`",
      "- TO: `### Requirement: The `foo` flag`",
    ];
    expect(deltaAnchors(delta.join("\n"))).toEqual(["requirement-the-foo-flag"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-written-in-another-spelling-openspec-accepts} */
  it("a rename in any spelling OpenSpec's archive accepts is read, and only at line start", () => {
    const delta = [
      "## RENAMED Requirements",
      "*   FROM:   ### Requirement: Old thing",
      "  + TO:   ### Requirement:   New thing   ",
      "FROM:`### Requirement: Second old`",
      "TO:`### Requirement: Second new`",
      "\t- FROM:\t### Requirement: Third old",
      "- TO:\u00a0### Requirement: Third new",
      "INTO: `### Requirement: Into`",
      "Moved here, then TO: `### Requirement: Mid sentence`",
      "Taken FROM: `### Requirement: Mid from`",
    ].join("\n");
    expect(deltaAnchors(delta)).toEqual([
      "requirement-new-thing",
      "requirement-second-new",
      "requirement-third-new",
    ]);
    expect([...deltaProof(delta).gone]).toEqual([
      "requirement-old-thing",
      "requirement-second-old",
      "requirement-third-old",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-an-unarchived-change-removes-or-renames} */
  it("a requirement an open change removes or renames away from needs no citing test", () => {
    const removed = ["## REMOVED Requirements", "### Requirement: Untested", "**Reason**: gone"];
    expect(
      unprovenRequirements(specs, [], new Map([["cap", deltaProof(removed.join("\n"))]])),
    ).toEqual(["cap: Requirement: `plan_shared` fires on a slug-mint, never: on open"]);
    const renamed = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: `plan_shared` fires on a slug-mint, never: on open`",
      "- TO: `### Requirement: Shared`",
    ];
    expect(
      unprovenRequirements(specs, [], new Map([["cap", deltaProof(renamed.join("\n"))]])),
    ).toEqual(["cap: Requirement: Untested"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-modified-requirement-proven-only-through-its-new-scenario} */
  it("a modified requirement is proven by a citation of a scenario its delta adds", () => {
    const delta = [
      "## MODIFIED Requirements",
      "### Requirement: Untested",
      "#### Scenario: Now tested",
    ];
    const citations = extractCitations("a.test.ts", cite("cap", "scenario-now-tested"));
    expect(
      unprovenRequirements(specs, citations, new Map([["cap", deltaProof(delta.join("\n"))]])),
    ).toEqual(["cap: Requirement: `plan_shared` fires on a slug-mint, never: on open"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-an-unarchived-change-marks-unenforced} */
  it("a requirement an open change marks unenforced needs no citing test", () => {
    const delta = [
      "## MODIFIED Requirements",
      "### Requirement: Untested",
      "",
      "**Unenforced:** a judgment call now.",
    ];
    expect(
      unprovenRequirements(specs, [], new Map([["cap", deltaProof(delta.join("\n"))]])),
    ).toEqual(["cap: Requirement: `plan_shared` fires on a slug-mint, never: on open"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-whose-prose-only-names-the-flag} */
  it("an open change whose delta prose only names the unenforced flag still needs a citing test", () => {
    const delta = [
      "## MODIFIED Requirements",
      "### Requirement: Untested",
      "",
      "A requirement nobody can test carries a `**Unenforced:**` line giving the reason.",
    ];
    expect(
      unprovenRequirements(specs, [], new Map([["cap", deltaProof(delta.join("\n"))]])),
    ).toEqual([
      "cap: Requirement: `plan_shared` fires on a slug-mint, never: on open",
      "cap: Requirement: Untested",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-line-with-no-partner} */
  it("a rename line with no partner is neither citable nor gone, as archive pairs them", () => {
    const delta = [
      "## RENAMED Requirements",
      "- TO: `### Requirement: Lone new`",
      "- FROM: `### Requirement: Untested`",
      "- T0: `### Requirement: Misspelled new`",
    ].join("\n");
    expect(deltaAnchors(delta)).toEqual([]);
    expect(unprovenRequirements(specs, [], new Map([["cap", deltaProof(delta)]]))).toEqual([
      "cap: Requirement: `plan_shared` fires on a slug-mint, never: on open",
      "cap: Requirement: Untested",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-delta-section-heading-in-another-letter-case} */
  it("a delta section heading is matched trimmed, in any letter case, and whole", () => {
    const delta = [
      "## Renamed Requirements",
      "- FROM: `### Requirement: Before`",
      "- TO: `### Requirement: After`",
      "##   modified requirements  ",
      "### requirement: After",
      "#### Scenario: Case-free heading",
      "## ADDED Requirements (draft)",
      "### Requirement: Draft thing",
      "#### Scenario: Draft works",
    ].join("\n");
    expect(deltaAnchors(delta)).toEqual([
      "requirement-after",
      "requirement-after",
      "scenario-case-free-heading",
    ]);
    const proof = deltaProof(delta);
    expect([...proof.gone]).toEqual(["requirement-before"]);
    expect([...proof.scenarios]).toEqual([["requirement-after", ["scenario-case-free-heading"]]]);
  });

  it("a repeated scenario name within a capability is reported", () => {
    const dup = new Map([
      ["cap", parseRequirements(SPEC + "\n### Requirement: B\n#### Scenario: Opening the dialog")],
    ]);
    expect(duplicateHeadings(dup)).toEqual([`cap#${SCENARIO}`]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-example-inside-a-code-fence} */
  it("a line inside a code fence is read as neither a heading nor a rename line", () => {
    const delta = [
      "## RENAMED Requirements",
      "```md",
      "- FROM: `### Requirement: Untested`",
      "- TO: `### Requirement: Backtick new`",
      "```",
      "  ~~~",
      "  - FROM: `### Requirement: `plan_shared` fires on a slug-mint, never: on open`",
      "  - TO: `### Requirement: Tilde new`",
      "  ~~~",
      "## ADDED Requirements",
      "  ~~~markdown",
      "### Requirement: Fenced added",
      "#### Scenario: Fenced scenario",
      "  ~~~",
      "```",
      "## RENAMED Requirements",
      "```",
      "- FROM: `### Requirement: Untested`",
      "- TO: `### Requirement: Heading new`",
    ].join("\n");
    expect(deltaAnchors(delta)).toEqual([]);
    expect([...deltaProof(delta).gone]).toEqual([]);
    expect(unprovenRequirements(specs, [], new Map([["cap", deltaProof(delta)]]))).toEqual([
      "cap: Requirement: `plan_shared` fires on a slug-mint, never: on open",
      "cap: Requirement: Untested",
    ]);
  });
});
