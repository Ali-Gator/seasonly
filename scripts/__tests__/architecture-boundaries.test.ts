/**
 * The analysis core stays pure: the lint rule really fires, and the core really
 * runs in plain Node.
 *
 * @see eslint.config.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const CORE_FILE = path.join(REPO_ROOT, "packages/analysis/src/probe.ts");

async function lintCore(source: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: REPO_ROOT });
  const [result] = await eslint.lintText(source, { filePath: CORE_FILE });
  return (result?.messages ?? []).map((m) => m.ruleId ?? m.message);
}

describe("packages/analysis imports", () => {
  /** {@link openspec/specs/architecture-boundaries/spec.md#scenario-the-core-imports-react} */
  it("refuses react", async () => {
    expect(
      await lintCore('import { useState } from "react";\nexport const x = useState;\n'),
    ).toContain("no-restricted-imports");
  });

  /** {@link openspec/specs/architecture-boundaries/spec.md#scenario-the-core-imports-a-node-built-in} */
  it.each(["fs", "node:fs", "next/server", "@supabase/supabase-js"])("refuses %s", async (mod) => {
    expect(await lintCore(`import * as m from "${mod}";\nexport const x = m;\n`)).toContain(
      "no-restricted-imports",
    );
  });

  it("allows zod and relative imports", async () => {
    expect(
      await lintCore(
        'import { z } from "zod";\nimport { a } from "./a";\nexport const x = [z, a];\n',
      ),
    ).toEqual([]);
  });
});

describe("packages/analysis runtime", () => {
  /** {@link openspec/specs/architecture-boundaries/spec.md#scenario-loading-the-core-outside-the-app} */
  it("loads in plain node", () => {
    const out = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'const m = await import("./packages/analysis/src/index.ts"); console.log(Object.keys(m).length > 0);',
      ],
      { cwd: REPO_ROOT, encoding: "utf8" },
    );
    expect(out.trim()).toBe("true");
  });

  /** {@link openspec/specs/architecture-boundaries/spec.md#scenario-a-dependency-is-added-to-the-core} */
  it("depends on nothing but zod", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "packages/analysis/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    expect(Object.keys(manifest.dependencies ?? {}).filter((d) => d !== "zod")).toEqual([]);
  });
});
