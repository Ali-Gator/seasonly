/**
 * The privacy policy and the terms of use, rendered to static markup.
 *
 * @see openspec/specs/legal-pages/spec.md
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { indexedUrls, pageMetadata } from "@/lib/site/routes";

import Privacy from "./privacy/page";
import Terms from "./terms/page";

/** The page's visible text, tags dropped and entities decoded, whitespace collapsed. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

const privacyHtml = renderToStaticMarkup(<Privacy />);
const privacy = text(privacyHtml);
const termsHtml = renderToStaticMarkup(<Terms />);
const terms = text(termsHtml);

describe("/privacy", () => {
  /** {@link openspec/specs/legal-pages/spec.md#scenario-reading-the-stored-items} */
  it("names each stored item with its purpose and how long it is kept", () => {
    expect(privacy).toMatch(/crop of your face\..*draping preview.*within 24 hours/);
    expect(privacy).toMatch(
      /Your report: your season, the color traits we measured, your quiz answers/,
    );
    expect(privacy).toMatch(/Up to 3 email addresses per report/);
    expect(privacy).toMatch(/note that you tapped Premium/);
    expect(privacy.match(/until you ask us to delete/g)?.length).toBeGreaterThanOrEqual(3);
    expect(privacy).toContain("The rest of your photo never leaves your phone.");
    expect(privacy).toMatch(/never use your face to identify you/);
    expect(privacy).toMatch(/Neither we nor Google use your photo to train AI models/);
  });

  /** {@link openspec/specs/legal-pages/spec.md#scenario-the-report-link} */
  it("says the report link is the only key and what anyone holding it can see", () => {
    expect(privacy).toContain("Its link is the only key to it.");
    expect(privacy).toMatch(
      /Anyone with the link can open your report, load your face crop while we still keep it, and see the email address/,
    );
  });

  /**
   * {@link openspec/specs/legal-pages/spec.md#scenario-the-ai-provider}
   * {@link openspec/specs/legal-pages/spec.md#scenario-every-service}
   */
  it("names every service, what it gets and how long it keeps it", () => {
    for (const service of [
      "Vercel",
      "Supabase, EU",
      "Google, through Vercel AI Gateway",
      "Resend",
      "PostHog, EU",
      "Sentry, Germany",
      "jsDelivr",
      "Google Cloud Storage",
      "Google, face-detection log",
    ]) {
      expect(privacy).toContain(service);
    }
    expect(privacy).toMatch(/Google does not train on them/);
    expect(privacy).toMatch(/Google may keep them up to 90 days, only to check for abuse/);
    expect(privacy).toMatch(/A quiz-only analysis sends nothing/);
    expect(privacy).toMatch(/first-party cookie/);
    expect(privacy).toMatch(/can include a report id/);
    expect(privacy).toMatch(/A deletion request reaches our own records, not their copies/);
    // One row per service, each with what it gets and how long it keeps it.
    expect(privacyHtml.match(/<dt/g)?.length).toBe(9);
    expect(privacy.match(/Kept: /g)?.length).toBe(9);
  });

  /** {@link openspec/specs/legal-pages/spec.md#scenario-asking-for-deletion} */
  it("gives the operator, the contact address, what to send and the 30-day answer", () => {
    expect(privacy).toMatch(/run by an individual in Bulgaria/);
    expect(privacyHtml).toContain('href="mailto:privacy@seasonly.me"');
    expect(privacy).toMatch(/Send your report link, or the email address you used/);
    expect(privacy).toContain("We answer within 30 days.");
    expect(privacy).toMatch(/copy of your data, ask us to correct it, or ask us to delete it/);
    expect(privacy).toMatch(/data protection authority/);
    expect(privacy).toMatch(/Last updated/);
  });
});

describe("/terms", () => {
  /** {@link openspec/specs/legal-pages/spec.md#scenario-reading-the-terms} */
  it("states the estimate, the age, own photos, no warranty, the law and the contact", () => {
    expect(terms).toMatch(
      /A result is an estimate for choosing colors\. It is not professional, medical or any other advice/,
    );
    expect(terms).toContain("You must be 16 or older to use Seasonly.");
    expect(terms).toContain("Upload only a photo of yourself.");
    expect(terms).toMatch(/provided as is, with no warranty/);
    expect(terms).toMatch(/not liable/);
    expect(terms).toMatch(
      /We may change these terms\. We post the new version on this page with a new date/,
    );
    expect(terms).toContain("The law of Bulgaria governs these terms.");
    expect(termsHtml).toContain('href="mailto:privacy@seasonly.me"');
    expect(termsHtml).toContain('href="/privacy"');
    expect(terms).toMatch(/Last updated/);
  });
});

describe("both legal pages", () => {
  /**
   * {@link openspec/specs/legal-pages/spec.md#scenario-the-privacy-page-is-fetched}
   * {@link openspec/specs/legal-pages/spec.md#scenario-the-terms-page-is-fetched}
   */
  it("are live and indexed, with no stub text", () => {
    for (const [path, page] of [
      ["/privacy", privacy],
      ["/terms", terms],
    ] as const) {
      expect(page).not.toMatch(/Coming soon/i);
      expect(pageMetadata(path).robots).toBeUndefined();
      expect(indexedUrls()).toContain(`https://seasonly.me${path}`);
    }
  });
});
