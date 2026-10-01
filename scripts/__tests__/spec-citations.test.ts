/**
 * Guard: spec citations resolve, and every requirement is proven by a test that cites it.
 *
 * Scans `apps/`, `packages/`, `scripts/`, `e2e/` and `evals/` for `{@link openspec/specs/<cap>/spec.md#<anchor>}`
 * and `@see openspec/specs/<cap>/spec.md` links. Anchors are GitHub heading slugs of a
 * `### Requirement:` or `#### Scenario:` heading. A citation resolves against the main
 * specs plus the ADDED/RENAMED headings of unarchived changes; only main-spec
 * requirements must be proven. A test is any file with `.test.` or `__tests__/` in its
 * path, or anything under `e2e/`.
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

function parseRequirements(text: string): Requirement[] {
  const requirements: Requirement[] = [];
  let current: Requirement | undefined;
  let fenced = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("```")) fenced = !fenced;
    if (fenced) continue;
    const req = /^### (Requirement: .+)$/.exec(line);
    const scenario = /^#### (Scenario: .+)$/.exec(line);
    if (req?.[1]) {
      current = { name: req[1].trim(), anchor: slugify(req[1]), scenarios: [], unenforced: false };
      requirements.push(current);
    } else if (/^#{1,3} /.test(line)) {
      current = undefined;
    } else if (current && scenario?.[1]) {
      current.scenarios.push(slugify(scenario[1]));
    } else if (current && line.includes("**Unenforced:**")) {
      current.unenforced = true;
    }
  }
  return requirements;
}

/** Anchors a change delta makes citable before archive: its ADDED requirements and scenarios, and RENAMED targets. */
function deltaAnchors(text: string): string[] {
  const anchors: string[] = [];
  for (const section of text.split(/^(?=## )/m)) {
    if (section.startsWith("## ADDED Requirements")) {
      for (const r of parseRequirements(section.replace(/^## .*\n/, ""))) {
        anchors.push(r.anchor, ...r.scenarios);
      }
    } else if (section.startsWith("## RENAMED Requirements")) {
      for (const m of section.matchAll(/TO: `### (Requirement: [^`]+)`/g)) {
        if (m[1]) anchors.push(slugify(m[1]));
      }
    }
  }
  return anchors;
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

function unprovenRequirements(specs: Map<string, Requirement[]>, citations: Citation[]): string[] {
  const cited = new Set(
    citations.filter((c) => isTest(c.file) && c.anchor).map((c) => `${c.capability}#${c.anchor}`),
  );
  const out: string[] = [];
  for (const [capability, requirements] of specs) {
    for (const r of requirements) {
      const proven = [r.anchor, ...r.scenarios].some((a) => cited.has(`${capability}#${a}`));
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

function resolvableAnchors(specs: Map<string, Requirement[]>): Map<string, Set<string>> {
  const known = new Map<string, Set<string>>();
  for (const [cap, requirements] of specs) {
    known.set(cap, new Set(requirements.flatMap((r) => [r.anchor, ...r.scenarios])));
  }
  for (const change of fs.readdirSync(CHANGES_DIR)) {
    const deltas = path.join(CHANGES_DIR, change, "specs");
    if (change === "archive" || !fs.existsSync(deltas)) continue;
    for (const cap of fs.readdirSync(deltas)) {
      const file = path.join(deltas, cap, "spec.md");
      if (!fs.existsSync(file)) continue;
      const anchors = known.get(cap) ?? new Set<string>();
      for (const a of deltaAnchors(fs.readFileSync(file, "utf-8"))) anchors.add(a);
      known.set(cap, anchors);
    }
  }
  return known;
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
    expect(unprovenRequirements(mainSpecs(), repoCitations())).toEqual([]);
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

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-test-written-during-an-unarchived-change} */
  it("a change delta makes its ADDED and RENAMED headings citable, not its MODIFIED ones", () => {
    const delta = [
      "## ADDED Requirements",
      "### Requirement: New thing",
      "#### Scenario: It works",
      "## MODIFIED Requirements",
      "### Requirement: Old thing",
      "## RENAMED Requirements",
      "- FROM: `### Requirement: Before`",
      "- TO: `### Requirement: After`",
    ].join("\n");
    expect(deltaAnchors(delta)).toEqual([
      "requirement-new-thing",
      "scenario-it-works",
      "requirement-after",
    ]);
  });

  it("a repeated scenario name within a capability is reported", () => {
    const dup = new Map([
      ["cap", parseRequirements(SPEC + "\n### Requirement: B\n#### Scenario: Opening the dialog")],
    ]);
    expect(duplicateHeadings(dup)).toEqual([`cap#${SCENARIO}`]);
  });
});
