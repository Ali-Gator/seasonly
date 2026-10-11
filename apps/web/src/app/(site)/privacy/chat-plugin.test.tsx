/**
 * The chat plugin's section of the privacy policy and its age rule in the terms.
 *
 * @see openspec/specs/legal-pages/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Terms from "../terms/page";
import Privacy from "./page";

/** Visible text, tags dropped and entities decoded, whitespace collapsed. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const privacyHtml = renderToStaticMarkup(<Privacy />);

/** The `#chat-plugin` section's markup. */
const section = privacyHtml.match(/<section[^>]*id="chat-plugin"[^>]*>[\s\S]*?<\/section>/)?.[0];

describe("/privacy#chat-plugin", () => {
  /** {@link openspec/specs/legal-pages/spec.md#scenario-reading-the-privacy-plugin-section} */
  it("says the plugin receives only the four answers, stores nothing, and links both providers", () => {
    expect(section).toBeDefined();
    const plugin = text(section ?? "");
    expect(plugin).toMatch(/only the four quiz answers/);
    expect(plugin).toMatch(/no photo/);
    expect(plugin).toMatch(/stores nothing/);
    expect(plugin).toMatch(/sends no analytics event/);
    expect(plugin).toMatch(/Vercel.*Sentry/);
    expect(section).toContain('href="https://openai.com/policies/privacy-policy/"');
    expect(section).toContain('href="https://www.anthropic.com/legal/privacy"');
  });
});

describe("/terms", () => {
  /** {@link openspec/specs/legal-pages/spec.md#scenario-reading-the-terms-plugin-age-rule} */
  it("states the plugin's age rule apart from the photo analysis", () => {
    const terms = text(renderToStaticMarkup(<Terms />));
    expect(terms).toMatch(
      /16 or older to use Seasonly\. This covers the photo analysis and the report/,
    );
    expect(terms).toMatch(/plugin for ChatGPT and Claude.*follows the age rules of the chat app/);
  });
});
