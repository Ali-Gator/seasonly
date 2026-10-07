/**
 * The share cards: their element trees are read without rendering; every card is then rendered
 * through the route and its PNG size read from the IHDR chunk.
 *
 * @see openspec/specs/share-card/spec.md
 */
import { PALETTES } from "@seasonly/analysis";
import { ImageResponse } from "next/og";
import { createElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";

import {
  dynamicParams,
  GET,
  generateStaticParams,
} from "@/app/images/share/[season]/[ratio]/route";
import { EM, OG_COLORS, OG_FONTS } from "@/lib/og";
import { chipRows, findText, flatten, inkRight, pngSize } from "@/lib/og/tree";
import { SEASON_SLUGS } from "@/lib/site/routes";

import { shareCard, shareCardAlt } from "./index";

const COLORS = [
  ["Terracotta", "#B4694F"],
  ["Deep Teal", "#4C7774"],
  ["Camel", "#C39D6F"],
  ["Dusty Rose", "#C4918A"],
  ["Olive", "#7B7848"],
  ["Mushroom", "#A08F7E"],
] as const;

const expected = (n: number) => [
  "My color season",
  "Soft Autumn",
  ...COLORS.slice(0, n).flatMap(([name, hex]) => [`chip:${hex}`, name, hex]),
  "Seasonly",
  "seasonly.me",
];

describe("share card content", () => {
  /** {@link openspec/specs/share-card/spec.md#scenario-soft-autumns-story-card-content} */
  it("story: kicker, season, the first 5 highlights as a list, wordmark and address", () => {
    const card = shareCard("soft-autumn", "story");
    expect(flatten(card)).toEqual(expected(5));
    expect(chipRows(card)).toEqual([5]);
  });

  /** {@link openspec/specs/share-card/spec.md#scenario-a-post-card-shows-six-colors} */
  it("post: the same five then Mushroom, in two rows of three", () => {
    const card = shareCard("soft-autumn", "post");
    expect(flatten(card)).toEqual(expected(6));
    expect(chipRows(card)).toEqual([3, 3]);
  });

  /** {@link openspec/specs/share-card/spec.md#requirement-a-card-shows-the-season-its-highlights-and-the-address-and-nothing-personal} */
  it("draws on the surface token", () => {
    expect(shareCard("soft-autumn", "story").props).toMatchObject({
      style: { background: OG_COLORS.surface },
    });
  });
});

describe("post card names", () => {
  /** A third of the post card's width inside its 1.25 em padding and two 0.5 em gaps. */
  const COLUMN = (1080 - 2 * 1.25 * EM - 2 * 0.5 * EM) / 3;

  /** {@link openspec/specs/share-card/spec.md#scenario-a-post-card-shows-six-colors} */
  it("fit one line of their column for every season, drawn in the card's own font", async () => {
    const widths: [string, number][] = [];
    for (const slug of SEASON_SLUGS) {
      const card = shareCard(slug, "post");
      for (const { name } of PALETTES[slug].highlights) {
        const label = findText(card, name) as ReactElement;
        const ground = { display: "flex", width: "100%", height: "100%", background: "#ffffff" };
        const res = new ImageResponse(createElement("div", { style: ground }, label), {
          width: 600,
          height: 80,
          fonts: [...OG_FONTS],
        });
        widths.push([name, inkRight(new Uint8Array(await res.arrayBuffer()))]);
      }
    }
    const widest = widths.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(widest[1]).toBeGreaterThan(0);
    expect(widest[1], `${widest[0]} is ${widest[1]} px wide`).toBeLessThanOrEqual(COLUMN);
  }, 60_000);
});

describe("share card alt text", () => {
  /** {@link openspec/specs/share-card/spec.md#scenario-soft-autumns-story-card-alt-text} */
  it("names the season and the colors shown", () => {
    expect(shareCardAlt("soft-autumn", "story")).toBe(
      "My color season: Soft Autumn. Terracotta, Deep Teal, Camel, Dusty Rose, Olive.",
    );
    expect(shareCardAlt("soft-autumn", "post")).toBe(
      "My color season: Soft Autumn. Terracotta, Deep Teal, Camel, Dusty Rose, Olive, Mushroom.",
    );
  });
});

describe("/images/share/[season]/[ratio]", () => {
  /**
   * {@link openspec/specs/share-card/spec.md#scenario-soft-autumns-story-card}
   * {@link openspec/specs/share-card/spec.md#scenario-every-season-and-ratio}
   */
  it("renders a 1080 × 1920 story and a 1080 × 1080 post PNG for every season", async () => {
    const params = await generateStaticParams();
    expect(params).toHaveLength(24);
    for (const p of params) {
      const res = await GET(new Request(`http://localhost/images/share/${p.season}/${p.ratio}`), {
        params: Promise.resolve(p),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(pngSize(new Uint8Array(await res.arrayBuffer()))).toEqual({
        width: 1080,
        height: p.ratio === "story" ? 1920 : 1080,
      });
    }
  }, 60_000);

  /** {@link openspec/specs/share-card/spec.md#scenario-an-unknown-season-or-ratio} */
  it("lists only the 12 slugs times story and post, and answers 404 for anything else", async () => {
    expect(dynamicParams).toBe(false);
    const params = await generateStaticParams();
    expect(new Set(params.map((p) => p.ratio))).toEqual(new Set(["story", "post"]));
    expect(params).not.toContainEqual(expect.objectContaining({ season: "autumn" }));
  });
});
