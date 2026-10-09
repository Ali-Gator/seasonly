/**
 * BL-03: Soft Autumn's story card, rendered here with the fonts read from disk, is byte for byte
 * the committed golden. e2e/report-delivery.spec.ts compares the built server's card with the same
 * file, so a font missing from the production bundle fails there.
 *
 * @see openspec/specs/share-card/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GET } from "@/app/images/share/[season]/[ratio]/route";

const GOLDEN = path.resolve(
  import.meta.dirname,
  "../../../../../e2e/fixtures/share-soft-autumn-story.png",
);

describe("Soft Autumn's story card", () => {
  /** {@link openspec/specs/share-card/spec.md#scenario-soft-autumns-story-card} */
  it("renders byte for byte as the golden", async () => {
    const res = await GET(new Request("http://localhost/images/share/soft-autumn/story"), {
      params: Promise.resolve({ season: "soft-autumn", ratio: "story" }),
    });
    const png = Buffer.from(await res.arrayBuffer());
    expect(png.equals(fs.readFileSync(GOLDEN))).toBe(true);
  }, 60_000);
});
