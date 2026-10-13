import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Result } from "../flow-state";
import { Blocked, Reveal } from "./steps";

const result = (reportId: string | null, agreement: Result["agreement"] = "agree"): Result => ({
  kind: "result",
  reportId,
  season: "soft-autumn",
  agreement,
  confidence: 0.5,
  photo: "ok",
  text: "personal",
});
const noop = () => {};
const text = (r: Result) =>
  renderToStaticMarkup(<Reveal result={r} onRetake={noop} onReport={noop} onTryAgain={noop} />)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

describe("Reveal", () => {
  /** {@link openspec/specs/season-reveal/spec.md#requirement-the-reveal-shows-the-season-family} */
  it("offers Get my full report for a result with a report id", () => {
    const out = text(result("k7m2qxAAAAAAAAAAAAAAAA"));
    expect(out).toContain("Get my full report");
    expect(out).toContain("Retake my photo");
    expect(out).not.toContain("We couldn't save your report");
    expect(out).not.toContain("Soft Autumn");
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-save-failed} */
  it("offers Try again, not Get my full report, for a null report id", () => {
    const out = text(result(null));
    expect(out).toContain("Autumn");
    expect(out).toContain("We couldn't save your report");
    expect(out).toContain("Your season is below, but your full report needs one more try.");
    expect(out).toContain("Try again");
    expect(out).toContain("Retake my photo");
    expect(out).not.toContain("Get my full report");
    // The note sits above the season, as on board 08f.
    expect(out.indexOf("We couldn't save your report")).toBeLessThan(
      out.indexOf("Your season family"),
    );
  });

  it("offers the report to a quiz-only result too", () => {
    const out = text(result("k7m2qxAAAAAAAAAAAAAAAA", "quiz-only"));
    expect(out).toContain("Get my full report");
    expect(out).toContain("Add a photo");
  });
});

describe("Blocked", () => {
  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-route-refuses-the-request} */
  it("asks to open seasonly.me in Safari or Chrome and offers to copy the link, not to try again", () => {
    const out = renderToStaticMarkup(<Blocked />);
    expect(out).toContain(">We couldn’t check this browser</h1>");
    expect(out).toContain(
      "Some in-app browsers block our check. Open seasonly.me in Safari or Chrome to continue.",
    );
    expect(out).toContain(">Copy the link</button>");
    expect(out).toContain("seasonly.me/analyze");
    expect(out).not.toContain("Try again");
  });
});
