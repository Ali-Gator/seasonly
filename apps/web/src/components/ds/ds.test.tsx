import fs from "node:fs";
import path from "node:path";

import { PALETTES } from "@seasonly/analysis";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Button,
  CameraFrame,
  DrapingPair,
  EmailInput,
  Icon,
  Note,
  PhotoTipCard,
  QuizOption,
  ReportSection,
  StepProgress,
  Swatch,
  SwatchGrid,
} from "./index";

const html = (el: ReactElement) => renderToStaticMarkup(el);

/** The `d` of the first path an icon draws, so a note's glyph can be told apart. */
const glyph = (markup: string) => /<path d="([^"]+)"/.exec(markup)?.[1];

describe("Swatch", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-a-swatch-renders} */
  it("shows the name and the uppercase hex as text, over a hidden chip in that color", () => {
    const out = html(<Swatch name="Terracotta" hex="#b4694f" />);
    expect(out).toContain(">Terracotta</span>");
    expect(out).toContain(">#B4694F</span>");
    expect(out).toMatch(
      /<div class="sn-swatch__chip" style="background:#b4694f" aria-hidden="true">/,
    );
    expect(out).toMatch(/^<figure class="sn-swatch">/);
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-large-swatch-renders} */
  it("marks the large variant and still shows the name and uppercase hex", () => {
    const out = html(<Swatch name="Terracotta" hex="#b4694f" size="lg" />);
    expect(out).toMatch(/^<figure class="sn-swatch sn-swatch--lg">/);
    expect(out).toContain(">Terracotta</span>");
    expect(out).toContain(">#B4694F</span>");
  });
});

describe("SwatchGrid", () => {
  const best = PALETTES["soft-autumn"].best;

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-seasons-palette-renders-as-a-grid} */
  it("renders one labeled list with every color in order", () => {
    const out = html(<SwatchGrid colors={best} label="Your Soft Autumn palette" columns={4} />);
    expect(out.match(/<ul /g)).toHaveLength(1);
    expect(out).toMatch(/^<ul class="sn-swatch-grid"[^>]* aria-label="Your Soft Autumn palette">/);
    const items = out.split("<li>").slice(1);
    expect(best).toHaveLength(24);
    expect(items).toHaveLength(24);
    best.forEach((c, i) => {
      expect(items[i]).toContain(`>${c.name}</span>`);
      expect(items[i]).toContain(`>${c.hex.toUpperCase()}</span>`);
    });
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-a-swatch-grid-shows-every-color-of-a-list-in-order} */
  it("lays out in the number of columns asked for", () => {
    const out = html(<SwatchGrid colors={best} columns={3} />);
    expect(out).toContain("grid-template-columns:repeat(3, minmax(0, 1fr))");
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-no-column-count-is-given} */
  it("lays out in 4 columns by default", () => {
    const out = html(<SwatchGrid colors={best} />);
    expect(out).toContain("grid-template-columns:repeat(4, minmax(0, 1fr))");
  });
});

describe("Button", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-a-button-without-a-destination} */
  it("is a native non-submitting button in the primary variant", () => {
    expect(html(<Button>Start</Button>)).toBe(
      '<button type="button" class="sn-btn sn-btn--primary">Start</button>',
    );
  });

  it("submits only when given a submit type", () => {
    expect(html(<Button type="submit">Send</Button>)).toMatch(/^<button type="submit"/);
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-button-with-a-destination} */
  it("is a link to its destination in the ghost variant at full width", () => {
    const out = html(
      <Button variant="ghost" block href="/analyze">
        Find my season
      </Button>,
    );
    expect(out).toMatch(/^<a /);
    expect(out).toContain('href="/analyze"');
    expect(out).toContain('class="sn-btn sn-btn--ghost sn-btn--block"');
    expect(out).not.toContain("<button");
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-disabled-button} */
  it("keeps aria-disabled and its label", () => {
    const out = html(<Button aria-disabled="true">Analyzing your photo</Button>);
    expect(out).toContain('aria-disabled="true"');
    expect(out).toContain(">Analyzing your photo</button>");
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-a-button-is-a-link-when-it-navigates-and-a-button-when-it-acts} */
  it("renders no href when disabled with a destination", () => {
    for (const off of [{ "aria-disabled": "true" as const }, { disabled: true }]) {
      const out = html(
        <Button href="/analyze" {...off}>
          Saved
        </Button>,
      );
      expect(out).not.toContain("href=");
      expect(out).toContain('aria-disabled="true"');
      expect(out).toContain('class="sn-btn sn-btn--primary"');
      expect(out).toContain(">Saved</a>");
    }
  });
});

describe("Icon", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-a-decorative-icon} */
  it("is hidden from assistive technology without a label, at 16px by default", () => {
    const out = html(<Icon name="check" />);
    expect(out).toContain('aria-hidden="true"');
    expect(out).not.toContain("role=");
    expect(out).toContain('width="16" height="16"');
    expect(out).toContain('stroke="currentColor"');
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-labeled-icon} */
  it("is an image named by its label", () => {
    const out = html(<Icon name="lock" label="Locked" />);
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Locked"');
    expect(out).not.toContain("aria-hidden");
  });
});

describe("Note", () => {
  const icon = (name: Parameters<typeof Icon>[0]["name"]) => glyph(html(<Icon name={name} />));

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-danger-note} */
  it("shows the cross icon, the title and the body as text in the danger tone", () => {
    const out = html(
      <Note tone="danger" title="Too dark">
        This photo is too dark to read your skin tone.
      </Note>,
    );
    expect(out).toMatch(/^<div class="sn-note sn-note--danger">/);
    expect(glyph(out)).toBe(icon("cross"));
    expect(out).toContain(">Too dark</p>");
    expect(out).toContain(">This photo is too dark to read your skin tone.</div>");
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-a-note-never-conveys-its-tone-by-color-alone} */
  it("defaults to the neutral tone, with check for success and info for neutral", () => {
    expect(glyph(html(<Note tone="success" title="Looks good" />))).toBe(icon("check"));
    const neutral = html(<Note title="Tip" />);
    expect(neutral).toMatch(/^<div class="sn-note sn-note--neutral">/);
    expect(glyph(neutral)).toBe(icon("info"));
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-note-with-a-chosen-icon} */
  it("shows a chosen icon instead of the default", () => {
    const out = html(<Note icon="sun" title="Retake tip" />);
    expect(glyph(out)).toBe(icon("sun"));
    expect(glyph(out)).not.toBe(icon("info"));
  });
});

describe("ReportSection", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-two-report-sections-on-one-page} */
  it("labels each section by its own h2", () => {
    const out = html(
      <>
        <ReportSection title="Your best neutrals" overline="Neutrals" intro="Wear these">
          <p>Body</p>
        </ReportSection>
        <ReportSection title="Colors to avoid" />
      </>,
    );
    const sections = [...out.matchAll(/<section class="sn-report" aria-labelledby="([^"]+)">/g)];
    const headings = [...out.matchAll(/<h2 class="h2" id="([^"]+)">([^<]+)<\/h2>/g)];
    expect(sections.map((m) => m[1])).toEqual(headings.map((m) => m[1]));
    expect(headings.map((m) => m[2])).toEqual(["Your best neutrals", "Colors to avoid"]);
    expect(new Set(headings.map((m) => m[1])).size).toBe(2);
    // Overline before the heading; intro and body after it.
    const first = out.slice(0, out.indexOf("</section>"));
    expect(first.indexOf("Neutrals")).toBeLessThan(first.indexOf("<h2"));
    expect(first.indexOf("Wear these")).toBeGreaterThan(first.indexOf("</h2>"));
    expect(first.indexOf("<p>Body</p>")).toBeGreaterThan(first.indexOf("Wear these"));
  });
});

describe("Stylesheets", () => {
  /** Read lazily, so the component tests above still run while ds.css is missing. */
  const read = (file: string) =>
    fs
      .readFileSync(path.resolve(import.meta.dirname, file), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
  const ds = () => read("ds.css");
  const all = () => read("../../app/globals.css") + ds();
  /** `.cls` not followed by more of a class name, so `.sn-swatch__chip` never counts for `.sn-swatch`. */
  const hasRule = (css: string, cls: string) => new RegExp(`\\.${cls}(?![\\w-])`).test(css);

  /** Classes the design system renders only as hooks, with no rule of their own. */
  const HOOKS = [
    "sn-note--neutral",
    "sn-report__overline",
    "sn-steps__count",
    "sn-steps__step--next",
  ];

  /** Every component in every variant, with every optional part filled. */
  const rendered = html(
    <>
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost" block href="/analyze">
        Ghost
      </Button>
      <Button aria-disabled="true">Disabled</Button>
      <EmailInput label="Email" hint="Hint" />
      <EmailInput label="Email" error="Error" />
      <Icon name="lock" label="Locked" />
      <Swatch name="Terracotta" hex="#b4694f" />
      <Swatch name="Terracotta" hex="#b4694f" size="lg" />
      <SwatchGrid colors={PALETTES["soft-autumn"].best} label="Palette" />
      {(["neutral", "danger", "success"] as const).map((tone) => (
        <Note key={tone} tone={tone} title="Title">
          Body
        </Note>
      ))}
      <ReportSection title="Title" overline="Overline" intro="Intro">
        <p>Body</p>
      </ReportSection>
      <StepProgress current={1} />
      <QuizOption name="q" value="a" label="Label" description="Description" readOnly />
      <QuizOption name="q" value="b" label="Label" readOnly />
      <CameraFrame caption="Caption">
        <video />
      </CameraFrame>
      <CameraFrame guide={false} label="Placeholder" />
      <DrapingPair
        best={{ name: "Terracotta", hex: "#b4694f" }}
        worst={{ name: "Fuchsia", hex: "#CC2A7E" }}
        faceSrc="/api/face/x"
        faceAlt="Your face"
      />
      <DrapingPair
        best={{ name: "Terracotta", hex: "#b4694f" }}
        worst={{ name: "Fuchsia", hex: "#CC2A7E" }}
      />
      <PhotoTipCard
        title="Title"
        body="Body"
        good={{ caption: "Good", src: "/good.jpg", alt: "" }}
        bad={{ caption: "Bad" }}
      />
    </>,
  );
  const classes = new Set(
    [...rendered.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1]?.split(/\s+/) ?? []),
  );

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-component-class-has-no-rule} */
  it("has a rule for every class the components render, and for the layout classes", () => {
    expect(read("../../app/globals.css")).toContain('@import "../components/ds/ds.css";');
    const css = all();
    const missing = [...classes, "sn-card", "sn-stack", "sn-slot"].filter(
      (cls) => !HOOKS.includes(cls) && !hasRule(css, cls),
    );
    expect(missing).toEqual([]);
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-every-class-a-component-renders-has-a-design-system-style} */
  it("lists only hooks that are rendered and have no rule", () => {
    const css = all();
    expect(HOOKS.filter((cls) => !classes.has(cls))).toEqual([]);
    expect(HOOKS.filter((cls) => hasRule(css, cls))).toEqual([]);
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-color-is-hard-coded} */
  it("takes every color in ds.css from a token variable", () => {
    expect(
      ds().match(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi) ?? [],
    ).toEqual([]);
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-stylesheet-loads-an-external-resource} */
  it("requests no external resource from ds.css", () => {
    expect(ds().match(/@import[^;]*|url\((?!\s*["']?data:)[^)]*\)/gi) ?? []).toEqual([]);
  });
});
