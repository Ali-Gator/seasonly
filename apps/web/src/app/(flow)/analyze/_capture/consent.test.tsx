/**
 * The consent step's copy, rendered to static markup: who reads the crop, and the privacy link.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Consent } from "./steps";

const words = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'");

describe("Consent", () => {
  /** {@link openspec/specs/capture-flow/spec.md#scenario-the-consent-step-names-who-reads-the-crop} */
  it("says Google, through Vercel, reads the crop without training on it, and links to /privacy", () => {
    const html = renderToStaticMarkup(
      <Consent cropUrl="blob:crop" onAgree={() => {}} onDecline={() => {}} />,
    );
    expect(words(html)).toContain(
      "An AI model from Google, through Vercel, reads the colors. It does not train on your photo.",
    );
    expect(html).toContain('href="/privacy"');
  });
});
