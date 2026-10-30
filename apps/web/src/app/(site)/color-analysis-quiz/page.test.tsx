/**
 * The quiz page's content, rendered to static markup, and its link in the footer.
 *
 * @see openspec/specs/quiz-page/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteShell } from "@/components/site-chrome";
import { SEASON_SLUGS } from "@/lib/site/routes";

import Page, { metadata } from "./page";

const html = renderToStaticMarkup(<Page />);

/** The text outside the quiz's fieldset: the island's question is not what the floor counts. */
const words = html
  .replace(/<fieldset[\s\S]*?<\/fieldset>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .split(/\s+/)
  .filter(Boolean);

describe("the page", () => {
  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-page-opens-on-question-1} */
  it("serves one h1 and question 1 as an h2 in its first HTML", () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain("Color analysis quiz: what season am I?");
    expect(html).toContain("Question 1 of 4");
    expect(html).toMatch(/<legend[^>]*><h2[^>]*>Look at the veins/);
    expect(html).not.toMatch(/checked=""/);
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-word-floor-without-the-quiz} */
  it("holds at least 250 words without the quiz, and no placeholder", () => {
    expect(words.length).toBeGreaterThanOrEqual(250);
    expect(words.join(" ")).not.toMatch(/\[[A-Z][A-Z ]+\]/);
    expect(html).not.toContain("sn-slot__label");
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-every-season-page-is-linked} */
  it("links every season page", () => {
    for (const slug of SEASON_SLUGS) expect(html).toContain(`href="/seasons/${slug}"`);
  });

  /** {@link openspec/specs/quiz-page/spec.md#requirement-the-quiz-page-carries-real-content-for-search} */
  it("names the three seasons only a photo gives, and answers What season am I?", () => {
    for (const season of ["Soft Autumn", "Soft Summer", "Bright Spring"])
      expect(html).toContain(season);
    expect(html).toContain("What season am I?");
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-quiz-page-is-indexed} */
  it("declares its route's metadata", () => {
    expect(metadata.title).toBe("Color analysis quiz: what season am I? · Seasonly");
    expect(metadata.alternates?.canonical).toBe("https://seasonly.me/color-analysis-quiz");
    expect(metadata.robots).toBeUndefined();
  });
});

describe("the footer", () => {
  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-footer-link} */
  it("lists the quiz page in More, after Sample report", () => {
    const footer = renderToStaticMarkup(<SiteShell>content</SiteShell>);
    const more = footer.slice(footer.indexOf('id="ft-more"'));
    expect(more).toContain('href="/color-analysis-quiz"');
    expect(more.indexOf("Color analysis quiz")).toBeGreaterThan(more.indexOf("Sample report"));
  });
});
