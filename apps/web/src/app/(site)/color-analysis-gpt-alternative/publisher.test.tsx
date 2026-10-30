/**
 * The plugin section is the listing's website URL, so it names the publisher.
 *
 * @see openspec/specs/site-content/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Page from "./page";

describe("/color-analysis-gpt-alternative#chat-plugin", () => {
  /** {@link openspec/specs/site-content/spec.md#scenario-the-plugin-section-names-the-publisher} */
  it("names the plugin's publisher", () => {
    const section = renderToStaticMarkup(<Page />).match(
      /<section[^>]*id="chat-plugin"[^>]*>[\s\S]*?<\/section>/,
    )?.[0];
    expect((section ?? "").replace(/\s+/g, " ")).toMatch(
      /published by Oleg Gordienov, an individual in Bulgaria/,
    );
  });
});
