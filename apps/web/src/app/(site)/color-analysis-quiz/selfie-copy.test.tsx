/**
 * The quiz page's two lines about the answers: only the selfie button on the result keeps them.
 *
 * @see openspec/specs/quiz-page/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Page from "./page";

/** The rendered text, with React's escaped apostrophe turned back. */
const html = renderToStaticMarkup(<Page />).replaceAll("&#x27;", "'");

const section = html.slice(
  html.indexOf('aria-labelledby="selfie-title"'),
  html.indexOf('aria-labelledby="families-title"'),
);

describe("the lines about the answers", () => {
  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-selfie-section-names-the-button-that-keeps-the-answers} */
  it("name the button on the result that keeps them", () => {
    expect(section).toContain(
      "The selfie button on your quiz result keeps your answers, so you won't be asked again.",
    );
    expect(html).toMatch(
      /What season am I\?<\/summary><div[^>]*>[^<]*add a selfie from your result\. Your answers carry over\.<\/div>/,
    );
    expect(html).not.toContain("Your answers come with you");
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-selfie-section-names-the-button-that-keeps-the-answers} */
  it("leave Find my colors a plain link to /analyze", () => {
    expect(section).toMatch(/<a [^>]*href="\/analyze"[^>]*>/);
  });
});
