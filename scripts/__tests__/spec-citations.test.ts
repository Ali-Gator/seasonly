/**
 * Guard: spec citations resolve, and every requirement is proven by a test that cites it.
 *
 * Scans `apps/`, `packages/`, `scripts/`, `e2e/` and `evals/` for `{@link openspec/specs/<cap>/spec.md#<anchor>}`
 * and `@see openspec/specs/<cap>/spec.md` links. Anchors are GitHub heading slugs of a
 * `### Requirement:` or `#### Scenario:` heading. A citation resolves against the main
 * specs plus the ADDED/MODIFIED/RENAMED headings of unarchived changes, a modified
 * requirement through its delta's headings in place of the main spec's; only main-spec
 * requirements must be proven, minus those an unarchived change removes, renames away
 * from or marks unenforced, and a modified one is proven and exempt only through its
 * delta's headings and flag. A delta meets the main spec by exact requirement name
 * (`Requirement: <trimmed>`), as archive matches them, never by anchor.
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
  /** Absent when GitHub renders no heading: no space or tab after `###`. */
  anchor?: string;
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

/** Archive's `normalizeLineEndings`: no UTF-8 BOM, `\n` line endings. */
function splitLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
}

/** A requirement's name as archive's `normalizeRequirementName` builds it: the captured title, trimmed. */
const requirementName = (title: string) => `Requirement: ${title.trim()}`;

/** A heading's text as GitHub renders it: spaces and tabs trimmed, a closing `#` run after a space or tab dropped. */
const headingText = (text: string) =>
  text.replace(/^[ \t]+|[ \t]+$/g, "").replace(/[ \t]+#+[ \t]*$/, "");

/** Archive's `REQUIREMENT_HEADER_REGEX`: the keyword in any letter case. */
const REQUIREMENT_HEADER = /^###\s*Requirement:\s*(.+)\s*$/i;

/** `mask` is the lines' slice of the whole delta's fence mask, when they are one section's body. */
function parseRequirements(lines: string[], mask: boolean[] = fenceMask(lines)): Requirement[] {
  const requirements: Requirement[] = [];
  let current: Requirement | undefined;
  for (const [i, line] of lines.entries()) {
    if (mask[i]) continue;
    const req = REQUIREMENT_HEADER.exec(line);
    // A space or tab after `####`, `Scenario:` in any letter case; the anchor is its text as GitHub renders it.
    const scenario = /^####[ \t]+(scenario:.*\S.*)$/i.exec(line);
    if (req?.[1]) {
      // The name is archive's; the anchor is GitHub's, which needs a space or tab after `###`.
      const heading = /^###[ \t](.*)$/.exec(line)?.[1];
      current = { name: requirementName(req[1]), scenarios: [], unenforced: false };
      if (heading !== undefined) current.anchor = slugify(headingText(heading));
      requirements.push(current);
    } else if (/^#{1,3} /.test(line)) {
      current = undefined;
    } else if (current && scenario?.[1]) {
      current.scenarios.push(slugify(headingText(scenario[1])));
    } else if (current && line.startsWith("**Unenforced:**")) {
      current.unenforced = true;
    }
  }
  return requirements;
}

/** A requirement's citable anchors: its own, when it has one, and its scenarios'. */
const anchorsOf = (r: Requirement) => (r.anchor ? [r.anchor, ...r.scenarios] : r.scenarios);

const renameLine = (keyword: "FROM" | "TO") =>
  new RegExp(
    `^[^\\S\\n]*[-*+]?[^\\S\\n]*${keyword}:[^\\S\\n]*\`?###[^\\S\\n]*Requirement:[^\\S\\n]*(.+?)\`?[^\\S\\n]*$`,
  );
const FROM_LINE = renameLine("FROM");
const TO_LINE = renameLine("TO");
const REMOVED_BULLET = /^\s*[-*+]\s*`?###\s*Requirement:\s*(.+?)`?\s*$/;

/**
 * One RENAMED section's rename pairs as requirement names, read in OpenSpec's archive shape
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
      from = requirementName(f[1]);
    } else if (t?.[1] && from) {
      pairs.push({ from, to: requirementName(t[1]) });
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
  const lines = splitLines(text);
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

/** Archive's `parseRemovedNames`: a REMOVED body's requirement headings and list bullets, in document order. */
function removedNames(body: string[], mask: boolean[]): string[] {
  return body.flatMap((line, i) => {
    const m = mask[i] ? null : (REQUIREMENT_HEADER.exec(line) ?? REMOVED_BULLET.exec(line));
    return m?.[1] ? [requirementName(m[1])] : [];
  });
}

/** One entry of a delta's plan: a requirement block, a removed name or a rename pair. */
type DeltaEntry =
  | { kind: "added" | "modified"; block: Requirement }
  | { kind: "removed"; name: string }
  | { kind: "renamed"; from: string; to: string };

/**
 * A delta read once, as archive reads it: every ADDED and MODIFIED block, REMOVED name and
 * RENAMED pair, section by section in document order. Within a section the order is the
 * section parser's, and each RENAMED body pairs its lines on its own.
 */
function deltaPlan(text: string): DeltaEntry[] {
  return deltaSections(text).flatMap(({ kind, body, mask }): DeltaEntry[] => {
    if (kind === "added" || kind === "modified")
      return parseRequirements(body, mask).map((block) => ({ kind, block }));
    if (kind === "removed") return removedNames(body, mask).map((name) => ({ kind, name }));
    if (kind === "renamed") return renamedPairs(body, mask).map((p) => ({ kind, ...p }));
    return [];
  });
}

/** Archive's `foldRequirementName`: a name in lower case with each whitespace run one space. */
const fold = (name: string) => name.toLowerCase().replace(/\s+/g, " ");

/**
 * Names archive's pre-validate refuses within one delta (`specs-apply.js`): a name repeated
 * within ADDED, MODIFIED or REMOVED, or as a rename's FROM or TO; a MODIFIED name also added,
 * removed or renamed from; an ADDED name also removed or equal to a rename's TO, compared
 * exactly; and a rename FROM with every REMOVED name that matches it folded
 * (`foldRequirementName`). A conflicting name's blocks, REMOVED entries and rename pairs all
 * count for nothing.
 */
function conflicts(plan: DeltaEntry[]): Set<string> {
  const names = (kind: "added" | "modified") =>
    plan.flatMap((e) => (e.kind === kind ? [e.block.name] : []));
  const [added, modified] = [names("added"), names("modified")];
  const removed = plan.flatMap((e) => (e.kind === "removed" ? [e.name] : []));
  const pairs = plan.flatMap((e) => (e.kind === "renamed" ? [e] : []));
  const [froms, tos] = [pairs.map((p) => p.from), pairs.map((p) => p.to)];
  const repeated = (list: string[]) => list.filter((n, i) => list.indexOf(n) !== i);
  return new Set([
    ...[added, modified, removed, froms, tos].flatMap(repeated),
    ...modified.filter((n) => added.includes(n) || removed.includes(n) || froms.includes(n)),
    ...added.filter((n) => removed.includes(n) || tos.includes(n)),
    ...froms.flatMap((from) => {
      const match = removed.filter((r) => fold(r) === fold(from));
      return match.length > 0 ? [from, ...match] : [];
    }),
  ]);
}

/**
 * The names a delta's plan drops and the rename walk left without them. `dropped` starts as
 * the pre-validate `conflicts` and grows by the removals archive's REMOVED step aborts on
 * (`specs-apply.js:318-324`). After the rename walk, removals are taken in document order
 * against a running copy of the names held: an exact match is deleted, so a later removal no
 * longer sees it; a name not held whose fold matches a held one drops both, and every name of
 * the accepted chain that ends at the held one, since archive applies none of it. The renames
 * are then walked again without any pair naming a dropped name, so the chain's old name stays
 * held, until nothing more drops. `left` is the names held after the walk and the removals.
 */
function nearMisses(
  plan: DeltaEntry[],
  existing: ReadonlySet<string>,
): ReturnType<typeof appliedRenames> & { dropped: Set<string>; left: Set<string> } {
  const dropped = conflicts(plan);
  for (;;) {
    const size = dropped.size;
    const walk = appliedRenames(plan, existing, dropped);
    const held = new Set(walk.held);
    for (const e of plan) {
      if (e.kind !== "removed" || dropped.has(e.name) || held.delete(e.name)) continue;
      let near = [...held].find((k) => fold(k) === fold(e.name));
      if (near === undefined) continue;
      dropped.add(e.name).add(near);
      for (const p of walk.pairs.toReversed()) if (p.to === near) dropped.add((near = p.from));
    }
    if (dropped.size === size) return { ...walk, dropped, left: held };
  }
}

/**
 * The rename pairs archive applies, walked once in document order against a running copy of
 * the main spec's names (`specs-apply.js` RENAMED): a pair naming a `dropped` name never enters
 * the walk; a pair is refused when its old name is not held or its new name already is; an
 * accepted pair renames in the copy, so a chain succeeds. Archive skips a pair whose old name
 * is gone and new name held as already applied; that pair is refused here too, since it
 * renames nothing. `held` is the copy after the walk: the main spec's names minus the accepted
 * old names plus the accepted new ones.
 */
function appliedRenames(
  plan: DeltaEntry[],
  existing: ReadonlySet<string>,
  dropped: ReadonlySet<string>,
): { pairs: { from: string; to: string }[]; held: Set<string> } {
  const held = new Set(existing);
  const pairs = plan
    .flatMap((e) => (e.kind === "renamed" ? [e] : []))
    .filter(({ from, to }) => {
      if (dropped.has(from) || dropped.has(to) || held.has(to) || !held.has(from)) return false;
      held.delete(from);
      held.add(to);
      return true;
    });
  return { pairs, held };
}

/**
 * Anchors a change delta makes citable before archive: the new names of the renames archive
 * would apply, in pair order, then its ADDED requirements and scenarios and MODIFIED
 * requirements and scenarios in document order. A rename's slot holds the anchor of the
 * MODIFIED block that names its new name, since archive writes that block's heading over the
 * renamed one, or nothing when that heading has none; with no such block it holds the slug of
 * the new name, as archive writes it. Archive applies RENAMED, then REMOVED, then
 * MODIFIED, so a rename's new name counts only when no later pair renames it again and the
 * delta does not remove it, and a MODIFIED block only when its name is still held after both
 * steps: in the main spec (`existing`, main-spec names) or renamed to, and not renamed away
 * from or removed. Archive adds last: an ADDED name still held then is a no-op when its block
 * matches the main spec's, whose anchors are already citable, and a refusal otherwise, so such
 * a block adds nothing. A rename that moves the name away frees it; a name also removed never
 * gets here, since `conflicts` drops it.
 */
function deltaAnchors(text: string, existing: ReadonlySet<string> = new Set()): string[] {
  const plan = deltaPlan(text);
  const { dropped, pairs, held: renamed, left: held } = nearMisses(plan, existing);
  const modified = new Map(
    plan.flatMap((e) =>
      e.kind === "modified" && !dropped.has(e.block.name) ? [[e.block.name, e.block] as const] : [],
    ),
  );
  const anchors = pairs
    .filter((p) => held.has(p.to))
    .flatMap((p) => {
      const block = modified.get(p.to);
      if (!block) return [slugify(p.to)];
      return block.anchor ? [block.anchor] : [];
    });
  for (const e of plan) {
    if (e.kind !== "added" && e.kind !== "modified") continue;
    const r = e.block;
    if (dropped.has(r.name)) continue;
    if (e.kind === "added" ? !renamed.has(r.name) : held.has(r.name)) anchors.push(...anchorsOf(r));
  }
  return anchors;
}

/** What open changes do to the proof check, per capability, keyed by requirement name. */
interface OpenDelta {
  /**
   * Requirements a delta removes, renames away from for good or marks unenforced: they need no
   * citing test. A name a later rename of the same delta moves back onto stays out.
   */
  gone: Set<string>;
  /** Scenarios of a modified requirement's delta blocks: citing one proves it. */
  scenarios: Map<string, string[]>;
  /**
   * The delta blocks that modify a requirement, every open change's in order. Archive writes
   * the block over the main spec's, so the requirement is cited, proven and exempt through
   * these, never through its main-spec heading, scenarios or flag.
   */
  replaced: Map<string, { anchor?: string; unenforced: boolean }[]>;
  /**
   * Main-spec names a delta's accepted renames move to a name the same delta modifies, followed
   * back through a chain: archive writes that block over the renamed one, so none of the old
   * requirement's anchors survive either.
   */
  carried: Set<string>;
}

/**
 * Reads a change delta into `into`, so several changes to one capability accumulate. A rename
 * archive would refuse — from a name `existing` (main-spec names) or an earlier rename does not
 * hold, or onto one it does — leaves its old name needing a citing test. A MODIFIED block's
 * scenarios, unenforced flag and place in `replaced` count whatever its name; only a main-spec
 * requirement of that name is ever looked up. A rename's main-spec name enters `carried` only
 * when a MODIFIED block of the same delta names where its chain ends. An accepted rename's old
 * name joins `gone` only when the walk no longer holds it: a round trip, or another
 * requirement renamed onto it, leaves it held, so it still needs a citing test.
 */
function deltaProof(
  text: string,
  into: OpenDelta = {
    gone: new Set(),
    scenarios: new Map(),
    replaced: new Map(),
    carried: new Set(),
  },
  existing: ReadonlySet<string> = new Set(),
): OpenDelta {
  const plan = deltaPlan(text);
  const { dropped, pairs, held } = nearMisses(plan, existing);
  const renamedFrom = new Set(pairs.map((p) => p.from));
  // The name each accepted chain of renames ends at, and the main-spec name it starts from.
  const origin = new Map<string, string>();
  for (const { from, to } of pairs) {
    origin.set(to, origin.get(from) ?? from);
    origin.delete(from);
  }
  for (const e of plan) {
    if (e.kind === "removed") {
      if (!dropped.has(e.name)) into.gone.add(e.name);
    } else if (e.kind === "renamed") {
      if (renamedFrom.has(e.from) && !held.has(e.from)) into.gone.add(e.from);
    } else if (e.kind === "modified") {
      const r = e.block;
      if (dropped.has(r.name)) continue;
      if (r.unenforced) into.gone.add(r.name);
      into.scenarios.set(r.name, [...(into.scenarios.get(r.name) ?? []), ...r.scenarios]);
      into.replaced.set(r.name, [...(into.replaced.get(r.name) ?? []), r]);
      const from = origin.get(r.name);
      if (from) into.carried.add(from);
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

/**
 * Main-spec requirements no test proves, as `<capability>: <name>`. A requirement an open
 * change modifies is proven only through its delta blocks: a block's heading anchor, when one
 * has an anchor, or a scenario of those blocks. It is exempt only through `gone`, so a main-spec
 * flag the blocks drop no longer counts.
 */
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
      if (delta?.gone.has(r.name)) continue;
      const replaced = delta?.replaced.get(r.name);
      const blocks = replaced ?? [r];
      const heads = blocks.flatMap((b) => (b.anchor ? [b.anchor] : []));
      const scenarios = replaced ? (delta?.scenarios.get(r.name) ?? []) : r.scenarios;
      // A requirement GitHub renders no heading for is never proven: its heading needs fixing.
      const proven =
        heads.length > 0 && [...heads, ...scenarios].some((a) => cited.has(`${capability}#${a}`));
      if (!proven && (replaced || !r.unenforced)) out.push(`${capability}: ${r.name}`);
    }
  }
  return out;
}

function duplicateHeadings(specs: Map<string, Requirement[]>): string[] {
  const out: string[] = [];
  for (const [capability, requirements] of specs) {
    const anchors = requirements.flatMap(anchorsOf);
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

let mainSpecsCache: Map<string, Requirement[]> | undefined;

/** Every permanent spec's requirements, by capability. Read from disk once per run; callers only read the map. */
function mainSpecs(): Map<string, Requirement[]> {
  if (mainSpecsCache) return mainSpecsCache;
  const specs = new Map<string, Requirement[]>();
  for (const cap of fs.readdirSync(SPECS_DIR)) {
    const file = path.join(SPECS_DIR, cap, "spec.md");
    if (fs.existsSync(file))
      specs.set(cap, parseRequirements(splitLines(fs.readFileSync(file, "utf-8"))));
  }
  mainSpecsCache = specs;
  return specs;
}

let openDeltasCache: [cap: string, text: string][] | undefined;

/** Every unarchived change's delta specs, as capability and text. Read from disk once per run; callers only read the list. */
function openDeltas(): [cap: string, text: string][] {
  if (openDeltasCache) return openDeltasCache;
  const out: [string, string][] = [];
  for (const change of fs.readdirSync(CHANGES_DIR)) {
    const deltas = path.join(CHANGES_DIR, change, "specs");
    if (change === "archive" || !fs.existsSync(deltas)) continue;
    for (const cap of fs.readdirSync(deltas)) {
      const file = path.join(deltas, cap, "spec.md");
      if (fs.existsSync(file)) out.push([cap, fs.readFileSync(file, "utf-8")]);
    }
  }
  openDeltasCache = out;
  return out;
}

/**
 * Every anchor a citation may name, by capability: the main spec's, minus those of each
 * requirement an open change modifies, by its own name or by the name an accepted chain of
 * renames in the same delta ends at (`carried`), plus each delta's own (`deltaAnchors`). A
 * requirement only renamed keeps its main-spec anchors until archive. `deltas` are the open
 * changes' `[capability, delta text]`, read from disk by default.
 */
function resolvableAnchors(
  specs: Map<string, Requirement[]>,
  deltas: [cap: string, text: string][] = openDeltas(),
): Map<string, Set<string>> {
  const names = (cap: string) => new Set(specs.get(cap)?.map((r) => r.name) ?? []);
  const open = openChanges(specs, deltas);
  const known = new Map<string, Set<string>>();
  for (const [cap, requirements] of specs) {
    const delta = open.get(cap);
    const kept = requirements.filter(
      (r) => !delta?.replaced.has(r.name) && !delta?.carried.has(r.name),
    );
    known.set(cap, new Set(kept.flatMap(anchorsOf)));
  }
  // ponytail: every open change's blocks count and no change's edits wait on another's, so any
  // conflict between two open changes on one requirement fails open: with two non-canonical
  // blocks the loser's anchor stays citable until the winner archives, and one change removing
  // X while another modifies it under a non-canonical heading keeps `requirementx` citable
  // whatever the archive order. Reading archive order would need it written down somewhere first.
  for (const [cap, text] of deltas) {
    const main = names(cap);
    const anchors = known.get(cap) ?? new Set<string>();
    for (const a of deltaAnchors(text, main)) anchors.add(a);
    known.set(cap, anchors);
  }
  return known;
}

function openChanges(
  specs: Map<string, Requirement[]> = mainSpecs(),
  deltas: [cap: string, text: string][] = openDeltas(),
): Map<string, OpenDelta> {
  const out = new Map<string, OpenDelta>();
  for (const [cap, text] of deltas) {
    const main = new Set(specs.get(cap)?.map((r) => r.name) ?? []);
    out.set(cap, deltaProof(text, out.get(cap), main));
  }
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
  const specs = new Map([["cap", parseRequirements(splitLines(SPEC))]]);
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
    const named = new Map([["cap", parseRequirements(prose)]]);
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
    const existing = new Set(["Requirement: Old thing", "Requirement: Before"]);
    expect(deltaAnchors(delta, existing)).toEqual([
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
    expect(deltaAnchors(delta.join("\n"), new Set(["Requirement: Old thing"]))).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-test-citing-a-new-name-that-holds-a-code-span} */
  it("a RENAMED name that holds a code span is citable in full", () => {
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: Old flag`",
      "- TO: `### Requirement: The `foo` flag`",
    ];
    expect(deltaAnchors(delta.join("\n"), new Set(["Requirement: Old flag"]))).toEqual([
      "requirement-the-foo-flag",
    ]);
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
    const old = new Set([
      "Requirement: Old thing",
      "Requirement: Second old",
      "Requirement: Third old",
    ]);
    expect(deltaAnchors(delta, old)).toEqual([
      "requirement-new-thing",
      "requirement-second-new",
      "requirement-third-new",
    ]);
    expect([...deltaProof(delta, undefined, old).gone]).toEqual([
      "Requirement: Old thing",
      "Requirement: Second old",
      "Requirement: Third old",
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
      unprovenRequirements(
        specs,
        [],
        new Map([
          [
            "cap",
            deltaProof(
              renamed.join("\n"),
              undefined,
              new Set(specs.get("cap")?.map((r) => r.name)),
            ),
          ],
        ]),
      ),
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
    const untested = new Set(["Requirement: Untested"]);
    expect(deltaAnchors(delta, untested)).toEqual([]);
    expect(unprovenRequirements(specs, [], new Map([["cap", deltaProof(delta)]]))).toEqual([
      "cap: Requirement: `plan_shared` fires on a slug-mint, never: on open",
      "cap: Requirement: Untested",
    ]);
    // Pairing starts empty in each RENAMED body, and a later FROM overwrites an unpaired one.
    const split = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: Untested`",
      "## RENAMED Requirements",
      "- TO: `### Requirement: Across bodies`",
      "- FROM: `### Requirement: `plan_shared` fires on a slug-mint, never: on open`",
      "- FROM: `### Requirement: Untested`",
      "- TO: `### Requirement: Overwritten new`",
    ].join("\n");
    expect(deltaAnchors(split, untested)).toEqual(["requirement-overwritten-new"]);
    expect([...deltaProof(split, undefined, untested).gone]).toEqual(["Requirement: Untested"]);
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
    const before = new Set(["Requirement: Before"]);
    expect(deltaAnchors(delta, before)).toEqual([
      "requirement-after",
      "requirement-after",
      "scenario-case-free-heading",
    ]);
    const proof = deltaProof(delta, undefined, before);
    expect([...proof.gone]).toEqual(["Requirement: Before"]);
    expect([...proof.scenarios]).toEqual([["Requirement: After", ["scenario-case-free-heading"]]]);
    // Archive drops a BOM and reads CRLF line endings as LF.
    const crlf = "\uFEFF" + delta.replace(/\n/g, "\r\n");
    expect(deltaAnchors(crlf, before)).toEqual(deltaAnchors(delta, before));
    expect([...deltaProof(crlf, undefined, before).gone]).toEqual(["Requirement: Before"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-scenario-heading-in-another-letter-case} */
  it("a scenario heading is read with any spacing after #### and Scenario: in any letter case", () => {
    const body = [
      "### Requirement: Loose scenarios",
      "#### scenario: Lower case",
      "####   Scenario:  Wide",
      "#### Notes",
      "##### Scenario: Too deep",
    ];
    expect(parseRequirements(body)[0]?.scenarios).toEqual([
      "scenario-lower-case",
      "scenario--wide",
    ]);
    expect(deltaAnchors(["## ADDED Requirements", ...body].join("\n"))).toEqual([
      "requirement-loose-scenarios",
      "scenario-lower-case",
      "scenario--wide",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-github-anchors-with-its-spaces-kept} */
  it("a heading is anchored as GitHub renders it, inner spaces kept and a closing # run dropped", () => {
    const body = [
      "### Requirement:  Two spaces",
      "### Requirement: Closed ###",
      "#### Scenario: Closed too ####",
    ];
    const parsed = parseRequirements(body);
    expect(parsed.map((r) => r.name)).toEqual([
      "Requirement: Two spaces",
      "Requirement: Closed ###",
    ]);
    const anchors = resolvableAnchors(new Map([["cap", parsed]]));
    const text = [
      "requirement--two-spaces",
      "requirement-closed",
      "scenario-closed-too",
      "requirement-two-spaces",
      "requirement-closed-",
    ];
    const citations = extractCitations("a.test.ts", text.map((a) => cite("cap", a)).join("\n"));
    expect(staleCitations(citations, anchors)).toEqual([
      "a.test.ts:4 cap#requirement-two-spaces",
      "a.test.ts:5 cap#requirement-closed-",
    ]);
    expect(deltaAnchors(["## ADDED Requirements", ...body].join("\n"))).toEqual([
      "requirement--two-spaces",
      "requirement-closed",
      "scenario-closed-too",
    ]);
    // CommonMark closes a heading only before spaces or tabs, so a trailing no-break space keeps the run.
    expect(parseRequirements(["### Requirement: X #\u00a0"])[0]?.anchor).toBe("requirement-x-");
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-with-no-space-after-its-marker} */
  it("a heading with no space after its marker has no anchor, and its requirement needs a citing test", () => {
    const glued = new Map([["cap", parseRequirements(["###Requirement: Glued"])]]);
    const citations = extractCitations("a.test.ts", cite("cap", "requirement-glued"));
    expect(staleCitations(citations, resolvableAnchors(glued))).toEqual([
      "a.test.ts:1 cap#requirement-glued",
    ]);
    expect(unprovenRequirements(glued, citations)).toEqual(["cap: Requirement: Glued"]);
    expect(deltaAnchors("## ADDED Requirements\n###Requirement: Glued")).toEqual([]);
    const nbsp = parseRequirements(["### Requirement: Spaced", "####\u00a0Scenario: No-break"]);
    expect(nbsp[0]?.scenarios).toEqual([]);
  });

  it("a repeated scenario name within a capability is reported", () => {
    const dup = new Map([
      [
        "cap",
        parseRequirements(
          splitLines(SPEC + "\n### Requirement: B\n#### Scenario: Opening the dialog"),
        ),
      ],
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
    // A fence closes only on its own marker, at least as long as the opening one.
    const nested = [
      "## RENAMED Requirements",
      "````",
      "```",
      "- FROM: `### Requirement: Untested`",
      "- TO: `### Requirement: Inside four backticks`",
      "````",
      "```",
      "~~~",
      "- FROM: `### Requirement: Untested`",
      "- TO: `### Requirement: Inside backticks`",
      "```",
    ].join("\n");
    expect(deltaAnchors(nested)).toEqual([]);
    expect([...deltaProof(nested).gone]).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-delta-name-that-differs-from-the-permanent-one-only-in-case-or-punctuation} */
  it("a delta name that differs from the permanent one only in case or punctuation matches nothing", () => {
    const delta = [
      "## REMOVED Requirements",
      "### Requirement: untested",
      "## RENAMED Requirements",
      "- FROM: `### Requirement: plan_shared fires on a slug-mint, never on open`",
      "- TO: `### Requirement: Shared`",
      "## MODIFIED Requirements",
      "### Requirement: UNTESTED",
      "**Unenforced:** a judgment call now.",
      "#### Scenario: Case only",
    ].join("\n");
    const both = [
      "cap: Requirement: `plan_shared` fires on a slug-mint, never: on open",
      "cap: Requirement: Untested",
    ];
    const open = new Map([["cap", deltaProof(delta)]]);
    expect(unprovenRequirements(specs, [], open)).toEqual(both);
    const main = new Set(specs.get("cap")?.map((r) => r.name));
    expect(deltaAnchors(delta, main)).toEqual([]);
    const citations = extractCitations("a.test.ts", cite("cap", "scenario-case-only"));
    expect(unprovenRequirements(specs, citations, open)).toEqual(both);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-removal-written-as-a-list-bullet} */
  it("a removal written as a list bullet, with or without backticks, is read as archive reads it", () => {
    const main = new Map([
      [
        "cap",
        parseRequirements(
          splitLines("### Requirement: Untested\n### Requirement: Second\n### Requirement: Third"),
        ),
      ],
    ]);
    const delta = [
      "## REMOVED Requirements",
      "- ### Requirement: Untested",
      "* `### Requirement: Second`",
      "```",
      "+ ### Requirement: Third",
      "```",
    ].join("\n");
    expect(unprovenRequirements(main, [], new Map([["cap", deltaProof(delta)]]))).toEqual([
      "cap: Requirement: Third",
    ]);
    expect([...deltaProof(delta).gone]).toEqual(["Requirement: Untested", "Requirement: Second"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-whose-old-name-matches-nothing} */
  it("a rename from a name the main spec does not hold makes nothing citable", () => {
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: Never there`",
      "- TO: `### Requirement: Fresh`",
      "## MODIFIED Requirements",
      "### Requirement: Fresh",
      "#### Scenario: Ghost rename",
    ].join("\n");
    const main = new Set(specs.get("cap")?.map((r) => r.name));
    expect(deltaAnchors(delta, main)).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-chain-of-renames-in-one-delta} */
  it("a chain of renames in one delta is applied in order", () => {
    const main = new Map([["cap", parseRequirements(["### Requirement: A"])]]);
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
      "- FROM: `### Requirement: B`",
      "- TO: `### Requirement: C`",
    ].join("\n");
    const names = new Set(["Requirement: A"]);
    expect(deltaAnchors(delta, names)).toContain("requirement-c");
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, [], open)).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-round-trip-in-one-delta} */
  it("a name a rename round trip gives back still needs a citing test", () => {
    const roundTrip = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
      "- FROM: `### Requirement: B`",
      "- TO: `### Requirement: A`",
    ].join("\n");
    const onlyA = new Map([["cap", parseRequirements(["### Requirement: A"])]]);
    const a = new Set(["Requirement: A"]);
    const back = new Map([["cap", deltaProof(roundTrip, undefined, a)]]);
    expect(unprovenRequirements(onlyA, [], back)).toEqual(["cap: Requirement: A"]);

    const moveOnto = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
      "- FROM: `### Requirement: C`",
      "- TO: `### Requirement: A`",
    ].join("\n");
    const aAndC = new Map([
      ["cap", parseRequirements(["### Requirement: A", "### Requirement: C"])],
    ]);
    const ac = new Set(["Requirement: A", "Requirement: C"]);
    const onto = new Map([["cap", deltaProof(moveOnto, undefined, ac)]]);
    expect(unprovenRequirements(aAndC, [], onto)).toEqual(["cap: Requirement: A"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-onto-a-name-the-permanent-spec-already-holds} */
  it("a rename onto a name the main spec already holds leaves its old name needing a citing test", () => {
    const main = new Map([
      ["cap", parseRequirements(["### Requirement: Untested", "### Requirement: Taken"])],
    ]);
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: Untested`",
      "- TO: `### Requirement: Taken`",
    ].join("\n");
    const names = new Set(["Requirement: Untested", "Requirement: Taken"]);
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, [], open)).toEqual([
      "cap: Requirement: Untested",
      "cap: Requirement: Taken",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-modified-and-also-removed-or-renamed-away} */
  it("a requirement modified and also removed or renamed away in one delta makes nothing citable", () => {
    const main = new Map([
      ["cap", parseRequirements(["### Requirement: Removed one", "### Requirement: Renamed one"])],
    ]);
    const delta = [
      "## REMOVED Requirements",
      "### Requirement: Removed one",
      "## MODIFIED Requirements",
      "### Requirement: Removed one",
      "#### Scenario: Modified then removed",
      "### Requirement: Renamed one",
      "#### Scenario: Modified then renamed",
      "## RENAMED Requirements",
      "- FROM: `### Requirement: Renamed one`",
      "- TO: `### Requirement: Fresh`",
    ].join("\n");
    const names = new Set(["Requirement: Removed one", "Requirement: Renamed one"]);
    expect(deltaAnchors(delta, names)).toEqual([]);
    const text = [
      "scenario-modified-then-removed",
      "scenario-modified-then-renamed",
      "requirement-fresh",
    ];
    const citations = extractCitations("a.test.ts", text.map((a) => cite("cap", a)).join("\n"));
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, citations, open)).toEqual([
      "cap: Requirement: Removed one",
      "cap: Requirement: Renamed one",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-delta-names-archives-pre-validate-refuses} */
  it("delta names archive's pre-validate refuses make nothing citable or exempt", () => {
    // [main names, delta, anchors a test cites]
    const shapes: [string[], string[], string[]][] = [
      [
        ["Both"],
        [
          "## ADDED Requirements",
          "### Requirement: Both",
          "#### Scenario: Added both",
          "## MODIFIED Requirements",
          "### Requirement: Both",
          "#### Scenario: Modified both",
        ],
        ["scenario-added-both", "scenario-modified-both"],
      ],
      [
        ["Old name"],
        [
          "## RENAMED Requirements",
          "- FROM: `### Requirement: Old name`",
          "- TO: `### Requirement: New name`",
          "## ADDED Requirements",
          "### Requirement: New name",
          "#### Scenario: Added new",
        ],
        ["requirement-new-name", "scenario-added-new"],
      ],
      [
        ["Folded one", "FOLDED  one"],
        [
          "## REMOVED Requirements",
          "### Requirement: FOLDED  one",
          "## RENAMED Requirements",
          "- FROM: `### Requirement: Folded one`",
          "- TO: `### Requirement: Folded new`",
        ],
        ["requirement-folded-new"],
      ],
      [
        ["Twice from", "Other", "Third"],
        [
          "## RENAMED Requirements",
          "- FROM: `### Requirement: Twice from`",
          "- TO: `### Requirement: Target a`",
          "- FROM: `### Requirement: Twice from`",
          "- TO: `### Requirement: Target b`",
          "- FROM: `### Requirement: Other`",
          "- TO: `### Requirement: Same to`",
          "- FROM: `### Requirement: Third`",
          "- TO: `### Requirement: Same to`",
        ],
        ["requirement-target-a", "requirement-target-b", "requirement-same-to"],
      ],
      [
        ["Mod twice", "Rem twice"],
        [
          "## ADDED Requirements",
          "### Requirement: Add twice",
          "### Requirement: Add twice",
          "## MODIFIED Requirements",
          "### Requirement: Mod twice",
          "#### Scenario: First copy",
          "### Requirement: Mod twice",
          "#### Scenario: Second copy",
          "## REMOVED Requirements",
          "- ### Requirement: Rem twice",
          "- ### Requirement: Rem twice",
        ],
        ["requirement-add-twice", "scenario-first-copy", "scenario-second-copy"],
      ],
    ];
    const got = shapes.map(([held, lines, cited]) => {
      const main = new Map([["cap", parseRequirements(held.map((n) => "### Requirement: " + n))]]);
      const names = new Set(main.get("cap")?.map((r) => r.name));
      const delta = lines.join("\n");
      const citations = extractCitations("a.test.ts", cited.map((a) => cite("cap", a)).join("\n"));
      const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
      return [deltaAnchors(delta, names), unprovenRequirements(main, citations, open)];
    });
    expect(got).toEqual(shapes.map(([held]) => [[], held.map((n) => "cap: Requirement: " + n)]));
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-name-added-and-removed-in-one-delta} */
  it("a name added and removed in one delta makes nothing citable or exempt", () => {
    const main = new Map([
      ["cap", parseRequirements(["### Requirement: Both", "#### Scenario: Permanent both"])],
    ]);
    const delta = [
      "## ADDED Requirements",
      "### Requirement: Both",
      "#### Scenario: Added both",
      "## REMOVED Requirements",
      "### Requirement: Both",
    ].join("\n");
    const names = new Set(["Requirement: Both"]);
    expect(deltaAnchors(delta, names)).not.toContain("scenario-added-both");
    const citations = extractCitations("a.test.ts", cite("cap", "scenario-added-both"));
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, citations, open)).toEqual(["cap: Requirement: Both"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-renames-new-name-the-same-delta-moves-on-or-removes} */
  it("a rename's new name that the same delta renames again is not citable", () => {
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
      "- FROM: `### Requirement: B`",
      "- TO: `### Requirement: C`",
    ].join("\n");
    const anchors = deltaAnchors(delta, new Set(["Requirement: A"]));
    expect(anchors).not.toContain("requirement-b");
    expect(anchors).toContain("requirement-c");
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-renames-new-name-the-same-delta-moves-on-or-removes} */
  it("a rename's new name that the same delta removes is not citable, and its old name is gone", () => {
    const main = new Map([["cap", parseRequirements(["### Requirement: A"])]]);
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
      "## REMOVED Requirements",
      "### Requirement: B",
    ].join("\n");
    const names = new Set(["Requirement: A"]);
    expect(deltaAnchors(delta, names)).not.toContain("requirement-b");
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, [], open)).not.toContain("cap: Requirement: A");
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-removal-archive-aborts-on-as-a-near-miss} */
  it("a removal that near-misses a rename's new name makes it not citable, and its old name needs a citing test", () => {
    const main = new Map([["cap", parseRequirements(["### Requirement: A"])]]);
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
      "## REMOVED Requirements",
      "### Requirement: b",
    ].join("\n");
    const names = new Set(["Requirement: A"]);
    const citations = extractCitations("a.test.ts", cite("cap", "requirement-b"));
    expect(staleCitations(citations, resolvableAnchors(main, [["cap", delta]]))).toEqual([
      "a.test.ts:1 cap#requirement-b",
    ]);
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, citations, open)).toEqual(["cap: Requirement: A"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-removal-archive-aborts-on-as-a-near-miss} */
  it("a removal that near-misses a modified requirement makes its new scenarios not citable", () => {
    const main = new Map([
      ["cap", parseRequirements(["### Requirement: Foo", "#### Scenario: Permanent foo"])],
    ]);
    const delta = [
      "## MODIFIED Requirements",
      "### Requirement: Foo",
      "#### Scenario: Modified foo",
      "## REMOVED Requirements",
      "### Requirement: foo",
    ].join("\n");
    const names = new Set(["Requirement: Foo"]);
    const citations = extractCitations("a.test.ts", cite("cap", "scenario-modified-foo"));
    expect(staleCitations(citations, resolvableAnchors(main, [["cap", delta]]))).toEqual([
      "a.test.ts:1 cap#scenario-modified-foo",
    ]);
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, citations, open)).toEqual(["cap: Requirement: Foo"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-removal-archive-aborts-on-as-a-near-miss} */
  it("a removal is checked for a near-miss only after earlier removals of the same delta", () => {
    const main = new Map([["cap", parseRequirements(["### Requirement: A"])]]);
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
      "## REMOVED Requirements",
      "### Requirement: B",
      "### Requirement: b",
    ].join("\n");
    const names = new Set(["Requirement: A"]);
    expect(deltaAnchors(delta, names)).toEqual([]);
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, [], open)).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-removal-archive-aborts-on-as-a-near-miss} */
  it("a removal takes headings and bullets in one document order", () => {
    const main = new Map([["cap", parseRequirements(["### Requirement: A"])]]);
    const names = new Set(["Requirement: A"]);
    const removing = (...lines: string[]) =>
      [
        "## RENAMED Requirements",
        "- FROM: `### Requirement: A`",
        "- TO: `### Requirement: B`",
        "## REMOVED Requirements",
        ...lines,
      ].join("\n");
    const unproven = (delta: string) =>
      unprovenRequirements(main, [], new Map([["cap", deltaProof(delta, undefined, names)]]));
    expect(unproven(removing("- `### Requirement: B`", "### Requirement: b"))).toEqual([]);
    expect(unproven(removing("- `### Requirement: b`", "### Requirement: B"))).toEqual([
      "cap: Requirement: A",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-removal-archive-aborts-on-as-a-near-miss} */
  it("a removal that near-misses the end of a rename chain makes no link of it citable", () => {
    const main = new Map([["cap", parseRequirements(["### Requirement: A"])]]);
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
      "- FROM: `### Requirement: B`",
      "- TO: `### Requirement: C`",
      "- FROM: `### Requirement: C`",
      "- TO: `### Requirement: D`",
      "## MODIFIED Requirements",
      "### Requirement: D",
      "#### Scenario: Modified d",
      "## REMOVED Requirements",
      "### Requirement: d",
    ].join("\n");
    const names = new Set(["Requirement: A"]);
    expect(deltaAnchors(delta, names)).toEqual([]);
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, [], open)).toEqual(["cap: Requirement: A"]);
  });

  /**
   * {@link openspec/specs/spec-workflow/spec.md#scenario-an-added-name-the-permanent-spec-already-holds}
   * {@link openspec/specs/spec-workflow/spec.md#scenario-an-added-name-a-rename-of-the-same-delta-frees}
   */
  it("an added name the main spec still holds adds nothing citable, unless a rename frees it", () => {
    const permanent = ["### Requirement: Held", "", "#### Scenario: P"];
    const main = parseRequirements(permanent);
    const names = new Set(["Requirement: Held"]);
    const known = (delta: string) => resolvableAnchors(new Map([["cap", main]]), [["cap", delta]]);
    const stale = (delta: string, ...anchors: string[]) =>
      staleCitations(
        extractCitations("a.test.ts", anchors.map((a) => cite("cap", a)).join("\n")),
        known(delta),
      );

    const differs = ["## ADDED Requirements", ...permanent, "", "#### Scenario: Q"].join("\n");
    expect(deltaAnchors(differs, names)).not.toContain("scenario-q");
    expect(stale(differs, "scenario-q")).toEqual(["a.test.ts:1 cap#scenario-q"]);

    const identical = ["## ADDED Requirements", ...permanent].join("\n");
    expect(stale(identical, "requirement-held", "scenario-p")).toEqual([]);

    const freed = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: X`",
      "- TO: `### Requirement: Y`",
      "## ADDED Requirements",
      "### Requirement: X",
      "#### Scenario: Z",
    ].join("\n");
    expect(deltaAnchors(freed, new Set(["Requirement: X"]))).toContain("scenario-z");
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-modified-requirement-whose-heading-archive-rewrites} */
  it("a modified requirement's permanent anchor stops resolving when its delta heading anchors differently", () => {
    const main = new Map([
      ["cap", parseRequirements(["### Requirement: Foo", "#### Scenario: P"])],
    ]);
    const delta = ["## MODIFIED Requirements", "### Requirement:Foo", "#### Scenario: P"].join(
      "\n",
    );
    const citations = extractCitations("a.test.ts", cite("cap", "requirement-foo"));
    expect(staleCitations(citations, resolvableAnchors(main, [["cap", delta]]))).toEqual([
      "a.test.ts:1 cap#requirement-foo",
    ]);
    // Nor does the permanent anchor prove the requirement any more.
    const open = new Map([["cap", deltaProof(delta, undefined, new Set(["Requirement: Foo"]))]]);
    expect(unprovenRequirements(main, citations, open)).toEqual(["cap: Requirement: Foo"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-with-no-space-that-a-change-fixes} */
  it("a glued permanent heading that a change modifies with the space is proven through the delta", () => {
    const main = new Map([["cap", parseRequirements(["###Requirement: Glued"])]]);
    const delta = [
      "## MODIFIED Requirements",
      "### Requirement: Glued",
      "#### Scenario: Fixed",
    ].join("\n");
    const citations = extractCitations("a.test.ts", cite("cap", "scenario-fixed"));
    const names = new Set(["Requirement: Glued"]);
    expect(staleCitations(citations, resolvableAnchors(main, [["cap", delta]]))).toEqual([]);
    const open = new Map([["cap", deltaProof(delta, undefined, names)]]);
    expect(unprovenRequirements(main, citations, open)).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-scenario-heading-archive-keeps-under-another-anchor} */
  it("a permanent scenario's anchor stops resolving when its delta heading anchors differently", () => {
    const permanent = [
      "### Requirement: One",
      "#### Scenario: Opening",
      "### Requirement: Two",
      "#### Scenario: Closing",
    ];
    const main = new Map([["cap", parseRequirements(permanent)]]);
    const delta = [
      "## MODIFIED Requirements",
      "### Requirement: One",
      "#### Opening",
      "### Requirement: Two",
      "#### Scenario:  Closing",
    ].join("\n");
    const text = ["scenario-opening", "scenario-closing"];
    const citations = extractCitations("a.test.ts", text.map((a) => cite("cap", a)).join("\n"));
    expect(staleCitations(citations, resolvableAnchors(main, [["cap", delta]]))).toEqual([
      "a.test.ts:1 cap#scenario-opening",
      "a.test.ts:2 cap#scenario-closing",
    ]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-modified-requirement-that-drops-its-unenforced-flag} */
  it("a permanent unenforced requirement a change modifies without the flag needs a citing test", () => {
    const permanent = ["### Requirement: Flagged", "", "**Unenforced:** a judgment call."];
    const main = new Map([["cap", parseRequirements(permanent)]]);
    const delta = ["## MODIFIED Requirements", "### Requirement: Flagged", "Now testable."];
    const open = new Map([
      ["cap", deltaProof(delta.join("\n"), undefined, new Set(["Requirement: Flagged"]))],
    ]);
    expect(unprovenRequirements(main, [], open)).toEqual(["cap: Requirement: Flagged"]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-a-renamed-requirement-modified-under-another-spelling} */
  it("a renamed requirement modified under another spelling is not citable by its plain new name", () => {
    const main = new Map([["cap", parseRequirements(["### Requirement: Before"])]]);
    const rename = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: Before`",
      "- TO: `### Requirement: After`",
      "## MODIFIED Requirements",
    ];
    const citations = extractCitations("a.test.ts", cite("cap", "requirement-after"));
    for (const heading of ["### Requirement:  After", "###Requirement: After"]) {
      const delta = [...rename, heading, "#### Scenario: Moved"].join("\n");
      expect(staleCitations(citations, resolvableAnchors(main, [["cap", delta]]))).toEqual([
        "a.test.ts:1 cap#requirement-after",
      ]);
    }
    // The modified heading's own anchor resolves in its place.
    const spaced = [...rename, "### Requirement:  After", "#### Scenario: Moved"].join("\n");
    const own = extractCitations("a.test.ts", cite("cap", "requirement--after"));
    expect(staleCitations(own, resolvableAnchors(main, [["cap", spaced]]))).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#requirement-citations-are-gated-at-every-commit} */
  it("a renamed requirement modified under another spelling keeps none of its old scenario anchors", () => {
    const main = new Map([
      ["cap", parseRequirements(["### Requirement: A", "#### Scenario: Opening"])],
    ]);
    const delta = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
      "## MODIFIED Requirements",
      "### Requirement: B",
      "#### Scenario:  Opening",
    ].join("\n");
    const text = ["scenario-opening", "scenario--opening"];
    const citations = extractCitations("a.test.ts", text.map((a) => cite("cap", a)).join("\n"));
    expect(staleCitations(citations, resolvableAnchors(main, [["cap", delta]]))).toEqual([
      "a.test.ts:1 cap#scenario-opening",
    ]);
    // Only renamed, A keeps its main-spec anchors until archive.
    const renameOnly = delta.split("\n").slice(0, 3).join("\n");
    const old = extractCitations(
      "a.test.ts",
      ["requirement-a", "scenario-opening"].map((a) => cite("cap", a)).join("\n"),
    );
    expect(staleCitations(old, resolvableAnchors(main, [["cap", renameOnly]]))).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#requirement-citations-are-gated-at-every-commit} */
  it("a rename in one change keeps its old anchors when only another change modifies the new name", () => {
    const main = new Map([
      ["cap", parseRequirements(["### Requirement: A", "#### Scenario: Opening"])],
    ]);
    const rename = [
      "## RENAMED Requirements",
      "- FROM: `### Requirement: A`",
      "- TO: `### Requirement: B`",
    ].join("\n");
    const modify = [
      "## MODIFIED Requirements",
      "### Requirement: B",
      "#### Scenario: Opening",
      "#### Scenario: New",
    ].join("\n");
    const deltas: [string, string][] = [
      ["cap", rename],
      ["cap", modify],
    ];
    const text = ["requirement-a", "scenario-opening"];
    const citations = extractCitations("a.test.ts", text.map((a) => cite("cap", a)).join("\n"));
    expect(staleCitations(citations, resolvableAnchors(main, deltas))).toEqual([]);
  });

  /** {@link openspec/specs/spec-workflow/spec.md#scenario-two-changes-modifying-one-requirement} */
  it("two changes modifying one requirement under different headings each make theirs citable", () => {
    const main = new Map([
      ["cap", parseRequirements(["### Requirement: Shared", "#### Scenario: S"])],
    ]);
    const names = new Set(["Requirement: Shared"]);
    const modify = (heading: string) =>
      ["## MODIFIED Requirements", heading, "#### Scenario: S"].join("\n");
    const [one, two] = [modify("### Requirement:Shared"), modify("### Requirement:  Shared")];
    const deltas: [string, string][] = [
      ["cap", one],
      ["cap", two],
    ];
    const open = new Map([["cap", deltaProof(two, deltaProof(one, undefined, names), names)]]);
    for (const anchor of ["requirementshared", "requirement--shared"]) {
      const citations = extractCitations("a.test.ts", cite("cap", anchor));
      expect(staleCitations(citations, resolvableAnchors(main, deltas))).toEqual([]);
      expect(unprovenRequirements(main, citations, open)).toEqual([]);
    }
  });
});
