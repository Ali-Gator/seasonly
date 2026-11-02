/**
 * The footer's "More" group, on the quiz page and on every other page.
 *
 * @see openspec/specs/quiz-page/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteShell } from "./site-chrome";

const nav = vi.hoisted(() => ({ pathname: null as string | null }));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

const QUIZ_ROW =
  '<li><a class="caption sn-navlink text-(--ink-muted)" href="/color-analysis-quiz">Color analysis quiz</a></li>';

/** The "More" group's markup at this path: from its title to the end of its list. */
function moreGroup(pathname: string) {
  nav.pathname = pathname;
  const html = renderToStaticMarkup(<SiteShell>content</SiteShell>);
  const group = html.slice(html.indexOf('id="ft-more"'));
  return group.slice(0, group.indexOf("</ul>"));
}

describe("the footer's More group", () => {
  beforeEach(() => {
    nav.pathname = null;
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-footer-on-the-quiz-page} */
  it("has no quiz row on the quiz page, and its other rows are unchanged", () => {
    const onQuizPage = moreGroup("/color-analysis-quiz");
    expect(onQuizPage).not.toContain("Color analysis quiz");
    expect(onQuizPage).toBe(moreGroup("/seasons/soft-autumn").replace(QUIZ_ROW, ""));
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-footer-link} */
  it("links the quiz page from any other path", () => {
    expect(moreGroup("/seasons/soft-autumn")).toContain(QUIZ_ROW);
  });
});
