/**
 * @see openspec/specs/ui-components/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DrapingPair, Icon } from "./index";

const BEST = { name: "Terracotta", hex: "#b4694f" };
const WORST = { name: "Fuchsia", hex: "#CC2A7E" };

/** The `d` of the first path an icon draws. */
const glyph = (markup: string) => /<path d="([^"]+)"/.exec(markup)?.[1];
const frames = (markup: string) => markup.split('<figure class="sn-drape">').slice(1);

describe("DrapingPair", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-a-pair-with-a-face} */
  it("shows best then worst, each in words with its icon, name and hex, over the same face", () => {
    // React hoists a preload link for each image ahead of the markup.
    const out = renderToStaticMarkup(
      <DrapingPair best={BEST} worst={WORST} faceSrc="/api/face/abc" faceAlt="Your face" />,
    ).replace(/^(<link [^>]*>)+/, "");
    expect(out).toMatch(/^<div class="sn-draping">/);
    const [best, worst] = frames(out);
    expect(frames(out)).toHaveLength(2);

    expect(best).toContain('<div class="sn-drape__frame" style="background:#b4694f">');
    expect(best).toContain('class="sn-drape__verdict sn-drape__verdict--best"');
    expect(glyph(best ?? "")).toBe(glyph(renderToStaticMarkup(<Icon name="check" />)));
    expect(best).toMatch(/Best<\/span>.*>Terracotta<\/span>.*>#B4694F<\/span>/);

    expect(worst).toContain('<div class="sn-drape__frame" style="background:#CC2A7E">');
    expect(worst).toContain('class="sn-drape__verdict sn-drape__verdict--worst"');
    expect(glyph(worst ?? "")).toBe(glyph(renderToStaticMarkup(<Icon name="cross" />)));
    expect(worst).toMatch(/Worst<\/span>.*>Fuchsia<\/span>.*>#CC2A7E<\/span>/);

    for (const frame of [best, worst]) {
      expect(frame).toContain('<img src="/api/face/abc" alt="Your face"/>');
    }
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-pair-without-a-face} */
  it("shows a slot labeled Face in each frame when there is no face", () => {
    const out = renderToStaticMarkup(<DrapingPair best={BEST} worst={WORST} />);
    expect(out).not.toContain("<img");
    expect(out.match(/<span class="sn-slot__label">Face<\/span>/g)).toHaveLength(2);
  });
});
