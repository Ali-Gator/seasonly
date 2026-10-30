/**
 * The legal pages name the person who runs Seasonly: the plugin listings' public
 * URLs must identify the same publisher as the submission.
 *
 * @see openspec/specs/legal-pages/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Terms from "../terms/page";
import Privacy from "./page";

const OPERATOR = /Seasonly is run by an individual in Bulgaria, Oleg Gordienov/;
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("the operator's name", () => {
  /** {@link openspec/specs/legal-pages/spec.md#scenario-the-privacy-policy-names-the-operator} */
  it("is on /privacy", () => {
    expect(text(renderToStaticMarkup(<Privacy />))).toMatch(OPERATOR);
  });

  /** {@link openspec/specs/legal-pages/spec.md#scenario-the-terms-name-the-operator} */
  it("is in the /terms contact section", () => {
    const contact = renderToStaticMarkup(<Terms />).match(
      /<section[^>]*id="contact"[^>]*>[\s\S]*?<\/section>/,
    )?.[0];
    expect(text(contact ?? "")).toMatch(OPERATOR);
  });
});
