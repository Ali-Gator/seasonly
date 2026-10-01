import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { manifestProblems } from "./manifest.ts";

const MANIFEST = path.join(import.meta.dirname, "manifest.json");

describe("eval manifest", () => {
  it("is well-formed", () => {
    expect(manifestProblems(JSON.parse(fs.readFileSync(MANIFEST, "utf8")))).toEqual([]);
  });

  it("rejects a malformed entry and a person with two seasons", () => {
    const photo = { file: "p01/a.jpg", person: "p01", season: "soft-autumn", light: "daylight" };
    expect(manifestProblems({ version: 1, photos: [{ ...photo, season: "autumn" }] })).toEqual([
      "photos[0].season: not one of the 12 seasons",
    ]);
    expect(
      manifestProblems({
        version: 1,
        photos: [photo, { ...photo, file: "p01/b.jpg", season: "deep-autumn" }],
      }),
    ).toEqual(["photos[1]: p01 labeled both soft-autumn and deep-autumn"]);
  });
});
