/**
 * The report-id mask PostHog runs on every event, and the rule that nobody is identified.
 *
 * @see openspec/specs/analytics/spec.md
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import posthog, { type CaptureResult } from "posthog-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { REPORT_ID } from "@/lib/draping/crops";
import { initPostHog } from "@/lib/observability/posthog";

import { maskReportIds, track } from ".";

vi.mock("posthog-js", () => ({ default: { __loaded: false, init: vi.fn(), capture: vi.fn() } }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  posthog.__loaded = false;
});

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const event = (fields: Partial<CaptureResult>): CaptureResult => ({
  uuid: "u",
  event: "$pageview",
  properties: {},
  ...fields,
});
const maskPath = (s: string) => maskReportIds(event({ properties: { s } }))?.properties.s;

describe("maskReportIds", () => {
  /**
   * {@link openspec/specs/analytics/spec.md#scenario-a-page-view-of-a-report}
   * {@link openspec/specs/analytics/spec.md#scenario-an-automatic-event-with-the-id-in-an-element}
   * {@link openspec/specs/analytics/spec.md#scenario-leaving-the-report-for-the-landing-page}
   */
  it("rewrites every /r/<id> in the URLs, the elements and the initial properties", () => {
    const out = maskReportIds(
      event({
        properties: {
          $current_url: `https://seasonly.me/r/${ID}`,
          $pathname: `/r/${ID}`,
          $referrer: `https://seasonly.me/r/${ID}?from=mail`,
          $elements: [{ tag_name: "p", $el_text: `seasonly.me/r/${ID}`, attr__href: `/r/${ID}` }],
          $elements_chain: `p:text="seasonly.me/r/${ID}"nth-child="1";a:href="/r/${ID}"`,
          $heatmap_data: { [`https://seasonly.me/r/${ID}`]: [{ x: 1 }] },
          count: 3,
          flag: null,
        },
        $set_once: { $initial_current_url: `https://seasonly.me/r/${ID}` },
      }),
    );
    expect(out).toEqual(
      event({
        properties: {
          $current_url: "https://seasonly.me/r/:id",
          $pathname: "/r/:id",
          $referrer: "https://seasonly.me/r/:id?from=mail",
          $elements: [{ tag_name: "p", $el_text: "seasonly.me/r/:id", attr__href: "/r/:id" }],
          $elements_chain: 'p:text="seasonly.me/r/:id"nth-child="1";a:href="/r/:id"',
          $heatmap_data: { "https://seasonly.me/r/:id": [{ x: 1 }] },
          count: 3,
          flag: null,
        },
        $set_once: { $initial_current_url: "https://seasonly.me/r/:id" },
      }),
    );
    expect(JSON.stringify(out)).not.toContain(ID);
  });

  /** {@link openspec/specs/analytics/spec.md#requirement-no-report-id-reaches-posthog} */
  it("leaves alone a path that is not a report id, and passes a dropped event through", () => {
    expect(maskPath(`/r/${ID.slice(1)}`)).toBe(`/r/${ID.slice(1)}`);
    expect(maskPath(`/r/${ID}A`)).toBe(`/r/${ID}A`);
    expect(maskPath(`/r/${ID.slice(0, 10)}+${ID.slice(11)}`)).toBe(
      `/r/${ID.slice(0, 10)}+${ID.slice(11)}`,
    );
    expect(maskPath("/seasons/soft-autumn")).toBe("/seasons/soft-autumn");
    expect(maskReportIds(null)).toBeNull();
  });

  /** {@link openspec/specs/analytics/spec.md#requirement-no-report-id-reaches-posthog} */
  it("masks exactly the ids REPORT_ID accepts", () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
    const random = (n: number) =>
      Array.from(randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");
    const candidates = [
      ...Array.from({ length: 50 }, () => randomBytes(16).toString("base64url")),
      ...[20, 21, 22, 23, 24].flatMap((n) => Array.from({ length: 10 }, () => random(n))),
    ];
    for (const id of candidates)
      expect(maskPath(`/r/${id}`) === "/r/:id", id).toBe(REPORT_ID.test(id));
  });
});

describe("initPostHog", () => {
  /** {@link openspec/specs/analytics/spec.md#requirement-no-report-id-reaches-posthog} */
  it("installs the mask on every event", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    expect(initPostHog()).toBe(true);
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({ before_send: maskReportIds }),
    );
  });
});

describe("track", () => {
  /** {@link openspec/specs/analytics/spec.md#scenario-posthog-off} */
  it("sends nothing until PostHog has loaded", () => {
    track("report_requested", { quiz_only: false });
    expect(posthog.capture).not.toHaveBeenCalled();
    posthog.__loaded = true;
    track("report_requested", { quiz_only: false });
    expect(posthog.capture).toHaveBeenCalledWith("report_requested", { quiz_only: false });
  });
});

describe("no person is identified", () => {
  /** {@link openspec/specs/analytics/spec.md#requirement-no-person-is-identified} */
  it("calls no identifying PostHog method and sets no person property anywhere in the app", () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const files = fs
      .readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.|__tests__/.test(f));
    expect(files.length).toBeGreaterThan(50);
    const hits = files.filter((f) =>
      /\.(identify|setPersonProperties|alias|register|register_once)\(|\$set(_once)?\s*:/.test(
        fs.readFileSync(path.join(root, f), "utf8"),
      ),
    );
    expect(hits).toEqual([]);
  });
});
