import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PremiumCardView, tapPremium } from "./premium-card";

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const card = (props: Partial<ComponentProps<typeof PremiumCardView>>) =>
  renderToStaticMarkup(<PremiumCardView phase="idle" email={null} onTap={() => {}} {...props} />);
const words = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

afterEach(() => {
  vi.useRealTimers();
});

describe("PremiumCardView", () => {
  /** {@link openspec/specs/interest-button/spec.md#scenario-a-report-nobody-has-asked-about} */
  it("shows the canvas card with an enabled button", () => {
    const out = card({});
    const text = words(out);
    expect(text).toContain("Next A deeper report");
    expect(text).toContain(
      "A capsule wardrobe built from your palette, outfit formulas and a palette card for shopping.",
    );
    expect(out).toMatch(
      /<button type="button" class="sn-btn sn-btn--secondary sn-btn--block">Premium report – coming soon<\/button>/,
    );
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-after-the-tap} */
  it("names the address in the clicked state", () => {
    const out = card({ phase: "clicked", email: "maya.reyes@gmail.com" });
    expect(out).toMatch(/aria-disabled="true"[^>]*>[\s\S]*We&#x27;ll let you know<\/button>/);
    expect(out).toContain("ph-no-capture");
    expect(words(out)).toContain(
      "Thanks for asking Premium reports aren't out yet. We'll email maya.reyes@gmail.com once, when they are. Nothing to pay now.",
    );
  });

  /** {@link openspec/specs/interest-button/spec.md#requirement-the-clicked-state-names-where-the-news-will-go} */
  it("says you when no address is stored", () => {
    expect(words(card({ phase: "clicked" }))).toContain("We'll email you once, when they are.");
  });

  /** {@link openspec/specs/interest-button/spec.md#requirement-a-failed-tap-can-be-repeated} */
  it("offers the button again with the error line after a failed tap", () => {
    const out = card({ phase: "failed" });
    expect(out).toContain(">Premium report – coming soon</button>");
    expect(out).not.toContain("aria-disabled");
    expect(out).toMatch(/role="alert"/);
    expect(words(out)).toContain("We couldn't save that. Please try again.");
  });

  it("disables the button while the tap is sent", () => {
    expect(card({ phase: "sending" })).toMatch(/<button type="button" aria-disabled="true"/);
  });
});

describe("tapPremium", () => {
  /** {@link openspec/specs/interest-button/spec.md#scenario-the-first-tap} */
  it("posts the tap and gives the address the route answers", async () => {
    const fetch = vi.fn(async () => Response.json({ ok: true, email: "maya.reyes@gmail.com" }));
    expect(await tapPremium(ID, { fetch })).toEqual({
      kind: "clicked",
      email: "maya.reyes@gmail.com",
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/reports/${ID}/interest`);
    expect(init.method).toBe("POST");
  });

  /** {@link openspec/specs/interest-button/spec.md#requirement-a-failed-tap-can-be-repeated} */
  it("fails on a server error, a network error and no answer within 10 s", async () => {
    expect(await tapPremium(ID, { fetch: async () => Response.json({}, { status: 500 }) })).toEqual(
      {
        kind: "failed",
      },
    );
    expect(await tapPremium(ID, { fetch: () => Promise.reject(new TypeError("offline")) })).toEqual(
      {
        kind: "failed",
      },
    );
    vi.useFakeTimers();
    const pending = tapPremium(ID, {
      fetch: (_url, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener("abort", () => reject(new DOMException("", "AbortError"))),
        ),
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await pending).toEqual({ kind: "failed" });
  });
});
