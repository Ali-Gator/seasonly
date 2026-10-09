import { describe, expect, it } from "vitest";

import { renderReportEmail } from "./render";

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const LINK = `https://seasonly.me/r/${ID}`;
/** The visible words of the HTML part, entities decoded. */
const words = (html: string) =>
  html
    .replace(/<head[\s\S]*?<\/head>/, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");

describe("renderReportEmail", () => {
  const photo = renderReportEmail({ id: ID, season: "soft-autumn", quizOnly: false });

  /** {@link openspec/specs/email-capture/spec.md#scenario-a-soft-autumn-report} */
  it("gives the canvas email for a Soft Autumn photo report", () => {
    expect(photo.subject).toBe("Your Soft Autumn color report");
    const text = words(photo.html);
    expect(text.trim().startsWith("30 colors with names and hex codes, plus what to avoid.")).toBe(
      true,
    );
    expect(text).toContain("Your color report is ready");
    expect(text).toContain(
      "Hi, here's what your selfie and quiz answers add up to. You're a Soft Autumn: warm, soft and earthy.",
    );
    expect(text).toContain("Soft Autumn Autumn family");
    const chips = [...text.matchAll(/(Terracotta|Deep Teal|Camel|Dusty Rose) (#[0-9A-F]{6})/g)];
    expect(chips.map((m) => `${m[1]} ${m[2]}`)).toEqual([
      "Terracotta #B4694F",
      "Deep Teal #4C7774",
      "Camel #C39D6F",
      "Dusty Rose #C4918A",
    ]);
    expect(photo.html.match(new RegExp(`href="${LINK}"`, "g"))).toHaveLength(2);
    expect(text).toContain("Open my report");
    expect(text).toContain(`Button not working? Paste this link: seasonly.me/r/${ID}`);
    expect(text).toContain(
      "Your photo is deleted within 24 hours of your analysis. We keep only your result.",
    );
  });

  /** {@link openspec/specs/email-capture/spec.md#requirement-the-report-email-carries-the-report-link} */
  it("carries the same words and the link in its plain-text part", () => {
    expect(photo.text).toContain("Your color report is ready");
    expect(photo.text).toContain("You're a Soft Autumn: warm, soft and earthy.");
    expect(photo.text).toContain("Terracotta #B4694F");
    expect(photo.text).toContain(`Open my report: ${LINK}`);
    expect(photo.text).toContain("Your photo is deleted within 24 hours");
    expect(photo.text).not.toMatch(/<[a-z]/);
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-a-quiz-only-report} */
  it("does not mention a photo for a quiz-only report", () => {
    const quiz = renderReportEmail({ id: ID, season: "soft-autumn", quizOnly: true });
    for (const part of [words(quiz.html), quiz.text]) {
      expect(part).toContain("here's what your quiz answers add up to");
      expect(part).not.toMatch(/selfie|photo/i);
    }
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-sent-from-a-preview} */
  it("links to the production site whatever the deployment", () => {
    const html = renderReportEmail({ id: ID, season: "true-winter", quizOnly: false }).html;
    expect([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual([LINK, LINK]);
  });

  it("loads nothing from outside the email", () => {
    expect(photo.html).not.toMatch(/<link|<script|<img|@import|url\(/);
  });
});
