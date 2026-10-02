import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import tokens from "./tokens.json";

const CSS = fs.readFileSync(path.resolve(import.meta.dirname, "../app/globals.css"), "utf-8");

/** Whitespace and quote style as prettier may leave them, so only real drift fails. */
function norm(value: string): string {
  return value
    .replace(/'/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .trim()
    .toLowerCase();
}

/** Declarations of the first block whose selector is exactly `selector`. */
function block(selector: string): Map<string, string> | undefined {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|[\\s{};])${escaped}\\s*\\{([^}]*)\\}`).exec(CSS);
  if (!m?.[1]) return undefined;
  const decls = new Map<string, string>();
  for (const decl of m[1].replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const i = decl.indexOf(":");
    if (i > 0) decls.set(decl.slice(0, i).trim(), norm(decl.slice(i + 1)));
  }
  return decls;
}

const root = block(":root") ?? new Map<string, string>();

const flat = [
  ...tokens.color.tokens,
  ...tokens.spacing.tokens,
  ...tokens.radius.tokens,
  ...tokens.shadow.tokens,
  ...tokens.size.tokens,
];

describe("design tokens in globals.css", () => {
  /** {@link openspec/specs/design-tokens/spec.md#scenario-a-token-is-missing-or-drifted} */
  it("defines every token as a :root variable with its value", () => {
    const drifted = flat
      .filter((t) => !t.name.startsWith("sample-"))
      .filter((t) => root.get(`--${t.name}`) !== norm(t.value))
      .map((t) => `--${t.name}: want ${t.value}, got ${root.get(`--${t.name}`) ?? "nothing"}`);
    expect(drifted).toEqual([]);
  });

  /** {@link openspec/specs/design-tokens/spec.md#scenario-a-token-is-missing-or-drifted} */
  it("ends both font variables with the tokens.json stacks", () => {
    for (const [family, stack] of Object.entries(tokens.type.families)) {
      const value = root.get(`--font-${family}`) ?? "";
      expect(value.endsWith(norm(stack)), `--font-${family}: ${value}`).toBe(true);
    }
  });

  /** {@link openspec/specs/design-tokens/spec.md#scenario-a-demo-color-is-defined-as-a-variable} */
  it("defines no sample- variable", () => {
    expect(CSS.match(/--sample-[\w-]*/g) ?? []).toEqual([]);
  });

  /** {@link openspec/specs/design-tokens/spec.md#scenario-a-type-style-differs-from-tokensjson} */
  it("defines each type class with its type style", () => {
    const wrong: string[] = [];
    for (const group of tokens.type.groups) {
      for (const style of group.styles as Record<string, string | number>[]) {
        const want: Record<string, string | number | undefined> = {
          "font-family": `var(--font-${group.family})`,
          "font-size": style.fontSize,
          "line-height": style.lineHeight,
          "font-weight": style.fontWeight,
          "letter-spacing": style.letterSpacing,
          "font-style": style.fontStyle,
          "font-variation-settings":
            style.opticalSize === undefined ? undefined : `"opsz" ${style.opticalSize}`,
        };
        const got = block(`.${style.name}`);
        if (!got) {
          wrong.push(`.${style.name}: missing`);
          continue;
        }
        for (const [prop, value] of Object.entries(want)) {
          if (value !== undefined && got.get(prop) !== norm(String(value))) {
            wrong.push(`.${style.name} ${prop}: want ${value}, got ${got.get(prop) ?? "nothing"}`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});
