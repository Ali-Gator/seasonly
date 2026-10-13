/**
 * t18-design-review: the swatch-name rules, the chip-only strip, the quiz sub-step, the quiz
 * option's image, the one-reference tip card and the draping frame without a ring.
 *
 * @see openspec/specs/ui-components/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DrapingPair, PhotoTipCard, QuizOption, StepProgress, SwatchStrip } from "./index";

const html = (el: ReactElement) => renderToStaticMarkup(el).replace(/^(<link [^>]*>)+/, "");

/** ds.css without comments, as the "every class has a style" test reads it. */
const css = fs
  .readFileSync(path.resolve(import.meta.dirname, "ds.css"), "utf-8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
}

describe("Swatch names", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-hex-codes-line-up} */
  it("always take two 18 px lines, so every hex in a row starts at the same height", () => {
    const name = rule(".sn-swatch__name");
    expect(name).toMatch(/line-height:\s*18px/);
    expect(name).toMatch(/min-height:\s*36px/);
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-name-never-splits-inside-a-word} */
  it("break only between words", () => {
    const name = rule(".sn-swatch__name");
    expect(name).toMatch(/overflow-wrap:\s*normal/);
    expect(name).toMatch(/word-break:\s*normal/);
    expect(css).not.toMatch(/overflow-wrap:\s*anywhere/);
  });
});

describe("SwatchStrip", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-a-season-preview} */
  it("is a labeled list of chips whose names are read but never shown, with no hex", () => {
    const colors = [
      { name: "Pumpkin", hex: "#D2691E" },
      { name: "Peacock Teal", hex: "#1F6E6E" },
      { name: "Mustard", hex: "#CC9B2B" },
      { name: "Salmon", hex: "#E07B5A" },
    ];
    const out = html(<SwatchStrip colors={colors} label="True Autumn colors" />);
    expect(out).toMatch(/^<ul class="sn-swatch-strip"[^>]* aria-label="True Autumn colors">/);
    const items = out.split("<li>").slice(1);
    expect(items).toHaveLength(4);
    colors.forEach((c, i) => {
      expect(items[i]).toContain(
        `<span class="sn-swatch-strip__chip" style="background:${c.hex}" aria-hidden="true"></span>`,
      );
      expect(items[i]).toContain(`<span class="sn-visually-hidden">${c.name}</span>`);
    });
    expect(out).not.toMatch(/#[0-9A-F]{6}</);
    expect(out).not.toContain("sn-swatch__hex");
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-a-swatch-strip-shows-chips-and-names-them-to-screen-readers} */
  it("draws square chips with the swatch edge", () => {
    const chip = rule(".sn-swatch-strip__chip");
    expect(chip).toMatch(/aspect-ratio:\s*1\b/);
    expect(chip).toContain("var(--swatch-edge)");
  });
});

describe("StepProgress with a sub-step", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-with-a-sub-step} */
  it("reads the question in the count line and fills the current bar by its share", () => {
    const out = html(<StepProgress current={1} sub={{ index: 0, count: 4 }} />);
    expect(out).toContain(">Step 2 of 3 · Question 1 of 4</p>");
    const quiz = out.split("<li").slice(1)[1] ?? "";
    expect(quiz).toContain('aria-current="step"');
    expect(quiz).toContain('style="--sn-steps-fill:25%"');
    expect(rule(".sn-steps__step--current .sn-steps__bar")).toContain("var(--sn-steps-fill");
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-step-progress-names-the-current-step-in-text} */
  it("fills nothing by share without a sub-step", () => {
    expect(html(<StepProgress current={1} />)).not.toContain("--sn-steps-fill");
  });
});

describe("QuizOption with an image", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-an-option-with-an-image} */
  it("shows the image with its alt text inside the label", () => {
    const out = html(
      <QuizOption
        name="veins"
        value="green"
        label="Green or olive"
        image="/images/quiz/veins-green.webp"
        imageAlt="A wrist with green veins"
        readOnly
      />,
    );
    expect(out).toMatch(/^<label class="sn-quiz sn-quiz--image">/);
    expect(out).toContain(
      '<img src="/images/quiz/veins-green.webp" alt="A wrist with green veins"/>',
    );
    expect(out.indexOf("<img")).toBeLessThan(out.indexOf("</label>"));
    expect(out).not.toContain(' image="');
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-a-quiz-option-is-a-native-radio-inside-its-label} */
  it("shows no slot without an image", () => {
    const out = html(<QuizOption name="veins" value="unsure" label="Hard to tell" readOnly />);
    expect(out).not.toContain("sn-quiz__slot");
    expect(out).toMatch(/^<label class="sn-quiz">/);
  });
});

describe("PhotoTipCard with several examples to avoid", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-one-reference-and-three-to-avoid} */
  it("shows Good once and Avoid three times, each with its caption", () => {
    const out = html(
      <PhotoTipCard
        title="Face a window, bare skin, no filter"
        good={{ caption: "Window light, bare skin", src: "/good.webp", alt: "Good" }}
        bad={[
          { caption: "Ceiling lamp", src: "/lamp.webp", alt: "Lamp" },
          { caption: "Foundation", src: "/makeup.webp", alt: "Makeup" },
          { caption: "Beauty filter", src: "/filter.webp", alt: "Filter" },
        ]}
      />,
    );
    expect(out.match(/>Good<\/span>/g)).toHaveLength(1);
    expect(out.match(/>Avoid<\/span>/g)).toHaveLength(3);
    for (const caption of ["Ceiling lamp", "Foundation", "Beauty filter"]) {
      expect(out).toContain(`Avoid</span><span class="sn-tip__caption">${caption}</span>`);
    }
    // The examples to avoid stack in their own column, after the reference.
    expect(out.indexOf('class="sn-tip__avoid"')).toBeGreaterThan(out.indexOf(">Good</span>"));
    expect(rule(".sn-tip__avoid")).toMatch(/flex-direction:\s*column/);
  });
});

describe("DrapingPair frame", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-no-ring-around-the-face} */
  it("draws no ring around the face and a collar in the frame's own color", () => {
    const face = rule(".sn-drape__face");
    expect(face).not.toMatch(/box-shadow|border(?!-radius)/);
    const collar = rule(".sn-drape__frame::after");
    expect(collar).toMatch(/background:\s*inherit/);
    expect(collar).toMatch(/bottom:\s*0/);
    expect(rule(".sn-drape__frame")).toMatch(/overflow:\s*hidden/);
    // The collar inherits the inline color each frame carries.
    const out = html(
      <DrapingPair
        best={{ name: "Terracotta", hex: "#b4694f" }}
        worst={{ name: "Fuchsia", hex: "#CC2A7E" }}
        faceSrc="/api/face/abc"
        faceAlt="Your face"
      />,
    );
    expect(out).toContain('<div class="sn-drape__frame" style="background:#b4694f">');
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-every-class-a-component-renders-has-a-design-system-style} */
  it("has a rule for each class the new variants render", () => {
    for (const cls of [
      "sn-swatch-strip",
      "sn-swatch-strip__chip",
      "sn-tip__avoid",
      "sn-quiz--image",
      "sn-quiz__slot",
    ]) {
      expect(css, cls).toMatch(new RegExp(`\\.${cls}(?![\\w-])`));
    }
  });
});
