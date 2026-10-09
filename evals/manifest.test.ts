/**
 * @see openspec/specs/analysis-eval/spec.md
 */
import { describe, expect, it } from "vitest";

import { expectOf, manifestProblems, type EvalPhoto } from "./manifest.ts";

const OLD: EvalPhoto = {
  file: "p01/a.jpg",
  person: "p01",
  season: "soft-autumn",
  light: "daylight",
};
const COMMONS: EvalPhoto = {
  ...OLD,
  source: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg",
  sha256: "a".repeat(64),
  license: "CC BY-SA 4.0",
  author: "Jane Doe",
};
const problems = (...photos: object[]) => manifestProblems({ version: 1, photos });

describe("manifest provenance fields", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-photo-from-wikimedia-commons} */
  it("accepts a Commons entry and reads it as usable", () => {
    expect(problems(COMMONS)).toEqual([]);
    expect(expectOf(COMMONS)).toBe("pass");
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-source-without-its-hash} */
  it("reports a source without its hash or license", () => {
    const without = (key: string) =>
      Object.fromEntries(Object.entries(COMMONS).filter(([k]) => k !== key));
    expect(problems(without("sha256"))).toEqual(["photos[0].sha256: required with a source"]);
    expect(problems(without("license"))).toEqual(["photos[0].license: required with a source"]);
  });

  it("reports a malformed source or hash", () => {
    expect(problems({ ...COMMONS, source: "http://example.com/a.jpg", sha256: "abc" })).toEqual([
      "photos[0].source: expected an https URL",
      "photos[0].sha256: expected 64 lowercase hex digits",
    ]);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-an-unknown-expected-outcome} */
  it("reports an unknown expected outcome", () => {
    expect(problems({ ...OLD, expect: "blurry" })).toEqual([
      "photos[0].expect: not one of pass, no-face, dark, tint, filter, several-faces",
    ]);
    expect(problems({ ...OLD, expect: "several-faces" })).toEqual([]);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#requirement-the-manifest-records-where-every-photo-comes-from} */
  it("keeps an old-shape entry valid", () => {
    expect(problems(OLD)).toEqual([]);
    expect(expectOf(OLD)).toBe("pass");
  });
});
