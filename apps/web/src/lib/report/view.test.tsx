import { PALETTES, SEASON_COPY, SEASON_SLUGS } from "@seasonly/analysis";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { seasonName } from "@/lib/site/routes";

import { DrapingView } from "./draping";
import type { StoredReport } from "./read";
import { ReportView } from "./view";

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const PHOTO: StoredReport = {
  season: "soft-autumn",
  agreement: "agree",
  textSource: "capped",
  summary: null,
  agreementNote: null,
  email: null,
  interested: false,
};
const html = (report: StoredReport) => renderToStaticMarkup(<ReportView id={ID} report={report} />);
const words = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
/** Each section's overline and title, in order. */
const sections = (markup: string) =>
  [
    ...markup.matchAll(
      /<p class="overline sn-report__overline">([^<]+)<\/p><h2 class="h2"[^>]*>([^<]+)<\/h2>/g,
    ),
  ].map((m) => `${m[1]} · ${m[2]}`);
/** The swatches of the grid with this label, as "Name #HEX". */
const grid = (markup: string, label: string) => {
  const list = new RegExp(`<ul[^>]*aria-label="${label}"[^>]*>([\\s\\S]*?)</ul>`).exec(markup)?.[1];
  return [
    ...(list ?? "").matchAll(
      /<span class="sn-swatch__name">([^<]+)<\/span><span class="sn-swatch__hex">([^<]+)<\/span>/g,
    ),
  ].map((m) => `${m[1]} ${m[2]}`);
};

describe("ReportView", () => {
  const out = html(PHOTO);
  const text = words(out);

  /** {@link openspec/specs/report-page/spec.md#scenario-a-soft-autumn-report} */
  it("renders the canvas report for a Soft Autumn photo record", () => {
    expect(text).toContain("Your season Soft Autumn Warm, soft and earthy.");
    expect(text).toContain(SEASON_COPY["soft-autumn"].summary);
    for (const [label, value] of [
      ["Undertone", SEASON_COPY["soft-autumn"].undertone],
      ["Chroma", SEASON_COPY["soft-autumn"].chroma],
      ["Contrast", SEASON_COPY["soft-autumn"].contrast],
    ])
      expect(text).toContain(`${label} ${value}`);
    expect(text).toContain("Photo and quiz agree");
    expect(sections(out)).toEqual([
      "Section 1 of 6 · Your palette",
      "Section 2 of 6 · Colors to avoid",
      "Section 3 of 6 · Your best neutrals",
      "Section 4 of 6 · Your metals",
      "Section 5 of 6 · Makeup and hair",
      "Section 6 of 6 · Draping preview",
    ]);
    const palette = grid(out, "Your Soft Autumn palette");
    expect(palette).toHaveLength(24);
    expect(palette[0]).toBe("Soft Coral #D88E77");
    const neutrals = grid(out, "Your best neutrals");
    expect(neutrals).toHaveLength(6);
    expect(neutrals.at(-1)).toBe("Espresso #4A3A33");
    expect(text).toContain("Wear");
    expect(text).toContain("Go easy on");
    for (const h of ["Lips", "Blush", "Eyes", "Hair"]) expect(text).toContain(h);
    expect(text).toContain(SEASON_COPY["soft-autumn"].hairTip);
  });

  /** {@link openspec/specs/report-page/spec.md#requirement-a-stored-report-renders-the-canvas-report} */
  it("shows every color's name and hex", () => {
    const names = [...out.matchAll(/class="sn-swatch__name">([^<]*)</g)];
    const hexes = [...out.matchAll(/class="sn-swatch__hex">(#[0-9A-F]{6})</g)];
    expect(names.length).toBeGreaterThan(30);
    expect(names.every((m) => m[1])).toBe(true);
    expect(hexes).toHaveLength(names.length);
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-a-stored-crop} */
  it("drapes the stored face, best first, under the season's draping line", () => {
    const faces = [...out.matchAll(/<img src="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((src) => src?.startsWith("/api/"));
    expect(faces).toEqual([`/api/face/${ID}`, `/api/face/${ID}`]);
    expect(text).toContain(
      `The same face crop on your best and your worst color. ${SEASON_COPY["soft-autumn"].drapingLine}`,
    );
    expect(text.indexOf("Best")).toBeLessThan(text.indexOf("Worst"));
  });

  /** {@link openspec/specs/report-page/spec.md#requirement-the-footer-says-where-the-report-lives} */
  it("ends with the footer's three lines", () => {
    expect(text).toContain("Your photo is deleted within 24 hours of your analysis.");
    expect(text).toContain(`This report stays at seasonly.me/r/${ID}.`);
    expect(text).toContain(
      "Seasons describe colors, not people. If a color you love isn't here, wear it away from your face.",
    );
  });

  /** {@link openspec/specs/report-page/spec.md#requirement-share-my-season-hands-over-the-share-cards} */
  it("offers Share my season and Save my palette", () => {
    expect(text).toContain("Share my season");
    expect(text).toContain("Save my palette");
    expect(text).toContain("Premium report – coming soon");
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-every-season} */
  it("gives 24 palette and 6 neutral colors, all distinct, for every season", () => {
    for (const season of SEASON_SLUGS) {
      const markup = html({ ...PHOTO, season });
      const palette = grid(markup, `Your ${seasonName(season)} palette`);
      const neutrals = grid(markup, "Your best neutrals");
      expect(palette, season).toHaveLength(24);
      expect(neutrals, season).toHaveLength(6);
      expect(new Set([...palette, ...neutrals].map((s) => s.split(" #")[1])).size, season).toBe(30);
      expect(PALETTES[season].best).toHaveLength(24);
    }
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-a-personal-report} */
  it("shows the personal summary and note body under the static note title", () => {
    const personal = words(
      html({
        ...PHOTO,
        textSource: "personal",
        summary: "Your warm hazel eyes set the tone.",
        agreementNote: "Green veins and gold jewelry point warm.",
      }),
    );
    expect(personal).toContain("Your warm hazel eyes set the tone.");
    expect(personal).not.toContain(SEASON_COPY["soft-autumn"].summary);
    expect(personal).toContain("Photo and quiz agree Green veins and gold jewelry point warm.");
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-a-fallback-report} */
  it("shows the static copy for a fallback record, even with stored text", () => {
    const capped = words(html({ ...PHOTO, textSource: "capped", summary: "stale" }));
    expect(capped).toContain(SEASON_COPY["soft-autumn"].summary);
    expect(capped).not.toContain("stale");
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-a-quiz-only-report} */
  it("leaves out the draping section and the photo for a quiz-only record", () => {
    const quiz = html({ ...PHOTO, agreement: "quiz-only", textSource: "quiz-only" });
    expect(sections(quiz)).toEqual([
      "Section 1 of 5 · Your palette",
      "Section 2 of 5 · Colors to avoid",
      "Section 3 of 5 · Your best neutrals",
      "Section 4 of 5 · Your metals",
      "Section 5 of 5 · Makeup and hair",
    ]);
    expect(quiz).not.toContain("/api/face/");
    expect(words(quiz)).toContain("Based on your answers");
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-a-quiz-only-reports-footer} */
  it("has no photo line in a quiz-only footer", () => {
    const footer = (markup: string) => words(/<footer[\s\S]*?<\/footer>/.exec(markup)?.[0] ?? "");
    const quiz = footer(html({ ...PHOTO, agreement: "quiz-only", textSource: "quiz-only" }));
    expect(quiz).not.toMatch(/photo/i);
    expect(quiz).toContain(`This report stays at seasonly.me/r/${ID}.`);
    expect(footer(out)).toMatch(/photo/);
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-a-desktop-window} */
  it("places the season and actions left of the sections from 1024 px", () => {
    expect(out).toMatch(
      /<section[^>]*class="[^"]*lg:col-span-4[^"]*"[^>]*>\s*<p class="overline">Your season/,
    );
    expect(out).toMatch(/class="[^"]*lg:col-start-6[^"]*"/);
  });
});

describe("ReportView and interest", () => {
  /** {@link openspec/specs/interest-button/spec.md#scenario-opened-again} */
  it("shows the clicked state with the address once interest exists", () => {
    const out = words(html({ ...PHOTO, interested: true, email: "maya.reyes@gmail.com" }));
    expect(out).toContain("We'll let you know");
    expect(out).toContain("We'll email maya.reyes@gmail.com once, when they are.");
    expect(out).not.toContain("Premium report – coming soon");
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-a-report-nobody-has-asked-about} */
  it("holds no address in the page before the tap", () => {
    const out = html({ ...PHOTO, interested: false, email: "maya.reyes@gmail.com" });
    expect(out).not.toContain("maya.reyes");
    expect(words(out)).toContain("Premium report – coming soon");
  });
});

describe("DrapingView", () => {
  const pair = PALETTES["soft-autumn"].draping;

  /** {@link openspec/specs/report-page/spec.md#scenario-the-crop-is-gone} */
  it("shows the face slot without an image and the deleted line once the face fails", () => {
    const gone = renderToStaticMarkup(<DrapingView id={ID} {...pair} deleted />);
    expect(gone).not.toContain("<img");
    expect(gone.match(/sn-slot__label">Face</g)).toHaveLength(2);
    expect(words(gone)).toContain(
      "Your photo has been deleted, so this shows the two colors only.",
    );
    const shown = renderToStaticMarkup(<DrapingView id={ID} {...pair} deleted={false} />);
    expect(shown).toContain(`src="/api/face/${ID}"`);
    expect(shown).not.toContain("has been deleted");
  });
});
