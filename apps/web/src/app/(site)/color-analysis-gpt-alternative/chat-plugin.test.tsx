/**
 * The GPT-alternative page's chat plugin section: the plugin's public documentation.
 *
 * @see openspec/specs/site-content/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Page from "./page";

const html = renderToStaticMarkup(<Page />);
const section = html.match(/<section[^>]*id="chat-plugin"[^>]*>[\s\S]*?<\/section>/)?.[0];
const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

describe("/color-analysis-gpt-alternative#chat-plugin", () => {
  /** {@link openspec/specs/site-content/spec.md#scenario-reading-the-plugin-section} */
  it("documents the plugin: its address, no photo, and its privacy section", () => {
    expect(section).toBeDefined();
    const plugin = text(section ?? "");
    expect(plugin).toContain("Use Seasonly in ChatGPT and Claude");
    expect(plugin).toContain("https://seasonly.me/api/mcp");
    expect(plugin).toMatch(/takes no photo/i);
    expect(section).toContain('href="/privacy#chat-plugin"');
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-the-plugin-section-links-its-chatgpt-listing} */
  it("links its ChatGPT listing", () => {
    expect(section).toContain(
      'href="https://chatgpt.com/plugins/plugin_asdk_app_6acbdb86f03c81919029b7db183ef3dc"',
    );
  });

  it("links no directory listing before one is published", () => {
    expect(section).not.toMatch(/chatgpt\.com\/apps|claude\.ai\/directory|claude\.com\/connectors/);
  });
});
