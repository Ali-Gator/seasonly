/**
 * The photo guide's tip cards, rendered to static markup.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Guide } from "./steps";

describe("Guide", () => {
  /**
   * {@link openspec/specs/capture-flow/spec.md#requirement-the-photo-guide-and-capture-follow-the-canvas}
   * (scenario "The guide's example photos")
   */
  it("shows a good and a bad photo with alt text on each of the three tip cards", () => {
    const html = renderToStaticMarkup(<Guide onCamera={() => {}} onPhoto={() => {}} />);
    const cards = html.split('class="sn-card sn-tip').slice(1);
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      const alts = [...card.matchAll(/<img [^>]*alt="([^"]*)"/g)].map((m) => m[1]);
      expect(alts).toHaveLength(2);
      for (const alt of alts) expect(alt?.trim()).toBeTruthy();
    }
    expect(html).not.toContain("sn-slot__label");
  });
});
