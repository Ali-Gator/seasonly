/**
 * The reveal line: what suits the season's colors, shown on the reveal without naming the season.
 * The 11 lines other than Soft Autumn's were approved on the canvas's 08e board on 2026-10-03.
 *
 * @see openspec/specs/report-text/spec.md
 */
import { describe, expect, it } from "vitest";

import { SEASON_SLUGS } from "../palettes/index.ts";
import { COPY_LIMITS, SEASON_COPY } from "./index.ts";

/** "soft-autumn" → "soft autumn", so "Soft Autumn" is caught in any case. */
const nameOf = (slug: string) => slug.replace("-", " ");

describe("reveal line", () => {
  /** {@link openspec/specs/report-text/spec.md#scenario-all-12-seasons} */
  it.each(SEASON_SLUGS)("%s has a reveal line within 160 that never names it", (slug) => {
    const line = SEASON_COPY[slug].revealLine;
    expect(COPY_LIMITS.revealLine).toBe(160);
    expect(line.trim()).not.toBe("");
    expect(line.length).toBeLessThanOrEqual(COPY_LIMITS.revealLine);
    expect(line.toLowerCase()).not.toContain(nameOf(slug));
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-soft-autumn-against-the-canvas} */
  it("Soft Autumn's reveal line is the canvas line", () => {
    expect(SEASON_COPY["soft-autumn"].revealLine).toBe(
      "Colors with a golden base and a little dust in them work with you. Bright, icy and very dark colors compete.",
    );
  });
});
