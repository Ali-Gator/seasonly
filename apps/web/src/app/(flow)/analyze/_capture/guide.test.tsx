/**
 * The photo guide's tip cards and upload notice, rendered to static markup.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Guide, Retake } from "./steps";

const words = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

describe("Guide", () => {
  /**
   * {@link openspec/specs/capture-flow/spec.md#requirement-the-photo-guide-and-capture-follow-the-canvas}
   * (scenario "The guide's example photos")
   */
  it("shows one tip card with a good and three bad photos, each with alt text", () => {
    const html = renderToStaticMarkup(<Guide onCamera={() => {}} onPhoto={() => {}} />);
    const cards = html.split('class="sn-card sn-tip').slice(1);
    expect(cards).toHaveLength(1);
    for (const card of cards) {
      const alts = [...card.matchAll(/<img [^>]*alt="([^"]*)"/g)].map((m) => m[1]);
      expect(alts).toHaveLength(4);
      for (const alt of alts) expect(alt?.trim()).toBeTruthy();
    }
    expect(html).not.toContain("sn-slot__label");
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-the-guide-names-who-reads-the-crop} */
  it("says only a face crop is sent once the quiz is finished, who reads it, and links to /privacy", () => {
    const html = renderToStaticMarkup(<Guide onCamera={() => {}} onPhoto={() => {}} />);
    expect(words(html)).toContain(
      "Only a crop of your face is sent, once you finish the quiz. An AI model from Google, through Vercel, reads its colors and doesn't train on it. We delete it within 24 hours. Privacy policy",
    );
    expect(html).toContain('href="/privacy"');
  });
});

describe("Guide, one card", () => {
  const html = () => renderToStaticMarkup(<Guide onCamera={() => {}} onPhoto={() => {}} />);

  /** {@link openspec/specs/capture-flow/spec.md#scenario-the-guides-example-photos} */
  it("shows one card with one Good photo and three Avoid photos, each with alt text", () => {
    const out = html();
    expect(out.split('class="sn-card sn-tip').slice(1)).toHaveLength(1);
    expect(out.match(/>Good<\/span>/g)).toHaveLength(1);
    expect(out.match(/>Avoid<\/span>/g)).toHaveLength(3);
    const alts = [...out.matchAll(/<img [^>]*alt="([^"]*)"/g)].map((m) => m[1]?.trim());
    expect(alts).toHaveLength(4);
    for (const alt of alts) expect(alt).toBeTruthy();
    for (const caption of ["Ceiling lamp", "Foundation", "Beauty filter"])
      expect(out).toContain(`<span class="sn-tip__caption">${caption}</span>`);
    expect(out).not.toContain("sn-slot__label");
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-a-desktop-window} */
  it("swaps the two actions' fills and puts upload on top from 1024 px", () => {
    const out = html();
    const stack = /<div class="sn-stack[^"]*">/.exec(out)?.[0] ?? "";
    expect(stack).toContain("lg:flex-col-reverse");
    const selfie = /<button [^>]*>(?:(?!<\/button>).)*Take a selfie<\/button>/.exec(out)?.[0] ?? "";
    expect(selfie).toContain("sn-btn--primary");
    expect(selfie).toContain("sn-btn--lg-swap");
    const upload =
      /<label class="([^"]*)">(?:(?!<\/label>).)*Upload a photo<\/label>/.exec(out)?.[1] ?? "";
    expect(upload).toContain("sn-btn--secondary");
    expect(upload).toContain("sn-btn--lg-swap");
  });
});

describe("Retake", () => {
  const retake = (offerQuizOnly: boolean) =>
    renderToStaticMarkup(
      <Retake
        problem="no-face"
        previewUrl="blob:preview"
        offerQuizOnly={offerQuizOnly}
        onRetake={() => {}}
        onPhoto={() => {}}
        onQuizOnly={() => {}}
      />,
    );
  /** The visible text of each action, in DOM order. */
  const actions = (out: string) =>
    [...out.matchAll(/<(button|label)[^>]* class="sn-btn ([^"]*)"[^>]*>(.*?)<\/\1>/g)].map((m) => [
      words(m[3] ?? "").trim(),
      m[2],
    ]);

  /** {@link openspec/specs/capture-flow/spec.md#scenario-first-failure} */
  it("reads Let’s retake this one and offers two actions on a first failure", () => {
    const out = retake(false);
    expect(out).toContain(">Let’s retake this one</h1>");
    expect(actions(out).map(([name]) => name)).toEqual([
      "Retake photo",
      "Upload a different photo",
    ]);
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-second-failure-in-a-row} */
  it("says it is the second try and offers the quiz as the secondary action after Retake photo", () => {
    const out = retake(true);
    expect(out).toContain(">Let’s try once more</h1>");
    expect(words(out)).toContain("That’s two tries. Try once more, or go on with the quiz alone.");
    const list = actions(out);
    expect(list.map(([name]) => name)).toEqual([
      "Retake photo",
      "Continue with the quiz only",
      "Upload a different photo",
    ]);
    expect(list[0]?.[1]).toContain("sn-btn--primary");
    expect(list[1]?.[1]).toContain("sn-btn--secondary");
    // The photo shrinks to a thumbnail beside the heading.
    expect(out).not.toContain("w-[220px]");
    expect(out.indexOf("sn-camera")).toBeLessThan(out.indexOf("<h1"));
  });
});
