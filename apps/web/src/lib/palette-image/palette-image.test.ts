/**
 * The palette images: the element tree is read without rendering; every image is then rendered
 * through the route and its PNG size read from the IHDR chunk.
 *
 * @see openspec/specs/palette-image/spec.md
 */
import { PALETTES } from "@seasonly/analysis";
import { ImageResponse } from "next/og";
import { createElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { dynamicParams, GET, generateStaticParams } from "@/app/images/palette/[season]/route";
import { EM, OG_COLORS, OG_FONTS } from "@/lib/og";
import { chipRows, findText, flatten, inkRight, pngSize } from "@/lib/og/tree";
import { SEASON_SLUGS } from "@/lib/site/routes";

import { paletteImage } from "./index";

describe("palette image content", () => {
  /** {@link openspec/specs/palette-image/spec.md#scenario-soft-autumns-palette-image-content} */
  it("shows the kicker, the season, 24 colors, Neutrals and 6 neutrals, the wordmark and address", () => {
    const { best, neutrals } = PALETTES["soft-autumn"];
    const chips = (list: typeof best) => list.flatMap((c) => [`chip:${c.hex}`, c.name, c.hex]);
    const image = paletteImage("soft-autumn");
    expect(flatten(image)).toEqual([
      "My colors",
      "Soft Autumn",
      ...chips(best),
      "Neutrals",
      ...chips(neutrals),
      "Seasonly",
      "seasonly.me",
    ]);
    expect(best[0]).toEqual({ name: "Soft Coral", hex: "#D88E77" });
    expect(best[23]).toEqual({ name: "Spruce", hex: "#3E6366" });
    expect(neutrals[0]).toEqual({ name: "Ivory Cream", hex: "#EDE3CF" });
    expect(neutrals[5]).toEqual({ name: "Espresso", hex: "#4A3A33" });
    // Two colors per row, as on board 11b.
    expect(chipRows(image)).toEqual(Array(15).fill(2));
  });

  /** {@link openspec/specs/palette-image/spec.md#requirement-a-palette-image-shows-all-30-colors-with-names-and-hex-codes} */
  it("draws on the surface token", () => {
    expect(paletteImage("soft-autumn").props).toMatchObject({
      style: { background: OG_COLORS.surface },
    });
  });
});

describe("palette image names", () => {
  /** Half the width inside the 1.25 em padding and the 0.5 em gap, less the 2 em chip and its 0.3 em gap. */
  const TEXT = (1080 - 2 * 1.25 * EM - 0.5 * EM) / 2 - 2 * EM - 0.3 * EM;

  /** {@link openspec/specs/palette-image/spec.md#requirement-a-palette-image-shows-all-30-colors-with-names-and-hex-codes} */
  it("fit one line of their cell for every season, drawn in the image's own font", async () => {
    for (const slug of SEASON_SLUGS) {
      const image = paletteImage(slug);
      const { best, neutrals } = PALETTES[slug];
      const labels = [...best, ...neutrals].map((c) => findText(image, c.name) as ReactElement);
      const ground = {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#ffffff",
      };
      const res = new ImageResponse(createElement("div", { style: ground }, ...labels), {
        width: 600,
        height: 1200,
        fonts: [...OG_FONTS],
      });
      const width = inkRight(new Uint8Array(await res.arrayBuffer()));
      expect(width).toBeGreaterThan(0);
      expect(width, `${slug}'s widest name is ${width} px`).toBeLessThanOrEqual(TEXT);
    }
  }, 60_000);
});

describe("/images/palette/[season]", () => {
  /**
   * {@link openspec/specs/palette-image/spec.md#scenario-soft-autumns-palette-image}
   * {@link openspec/specs/palette-image/spec.md#scenario-every-season}
   */
  it("renders a 1080 × 1920 PNG for every season", async () => {
    const params = await generateStaticParams();
    expect(params).toHaveLength(12);
    for (const p of params) {
      const res = await GET(new Request(`http://localhost/images/palette/${p.season}`), {
        params: Promise.resolve(p),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(pngSize(new Uint8Array(await res.arrayBuffer()))).toEqual({
        width: 1080,
        height: 1920,
      });
    }
  }, 180_000);

  /** {@link openspec/specs/palette-image/spec.md#scenario-an-unknown-season} */
  it("lists only the 12 slugs and answers 404 for anything else", async () => {
    expect(dynamicParams).toBe(false);
    expect(await generateStaticParams()).not.toContainEqual({ season: "autumn" });
    const res = await GET(new Request("http://localhost/"), {
      params: Promise.resolve({ season: "autumn" }),
    });
    expect(res.status).toBe(404);
  });
});
