/**
 * One season list for the workspace: the web route map and the eval manifest take theirs
 * from the analysis core.
 *
 * @see openspec/specs/season-palettes/spec.md
 */
import { describe, expect, it } from "vitest";

import { SEASON_SLUGS as WEB_SLUGS } from "../../apps/web/src/lib/site/routes.ts";
import { manifestProblems } from "../../evals/manifest.ts";
import { SEASON_SLUGS } from "../../packages/analysis/src/index.ts";

describe("season list consumers", () => {
  /** {@link openspec/specs/season-palettes/spec.md#scenario-the-web-route-map} */
  it("gives the web route map the core's slugs in order", () => {
    expect(WEB_SLUGS).toEqual(SEASON_SLUGS);
  });

  /** {@link openspec/specs/season-palettes/spec.md#scenario-the-eval-manifest} */
  it("rejects a retired season name in the eval manifest", () => {
    const photo = { file: "p01/a.jpg", person: "p01", season: "warm-autumn", light: "daylight" };
    expect(manifestProblems({ version: 1, photos: [photo] })).toEqual([
      "photos[0].season: not one of the 12 seasons",
    ]);
    expect(manifestProblems({ version: 1, photos: [{ ...photo, season: "true-autumn" }] })).toEqual(
      [],
    );
  });
});
