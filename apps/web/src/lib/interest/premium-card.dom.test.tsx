// @vitest-environment jsdom
/**
 * The Premium card's event, tapped in jsdom with PostHog mocked as loaded.
 *
 * @see openspec/specs/analytics/spec.md
 */
import posthog from "posthog-js";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { PremiumCard } from "./premium-card";

vi.mock("posthog-js", () => ({ default: { __loaded: true, capture: vi.fn() } }));

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
let root: Root;
let container: HTMLDivElement;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Renders the card with the interest route answering `status`, and taps it. */
async function tap(status: number) {
  const fetch = vi.fn(async () => Response.json({ email: "maya@example.com" }, { status }));
  vi.stubGlobal("fetch", fetch);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<PremiumCard reportId={ID} interested={false} email={null} />));
  await act(async () => {
    container.querySelector("button")?.click();
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(fetch).toHaveBeenCalledOnce();
}

describe("premium_tapped", () => {
  /** {@link openspec/specs/analytics/spec.md#requirement-share-and-save-events-carry-how-they-ended} */
  it("is sent once interest is recorded, without the id or the address", async () => {
    await tap(200);
    expect(container.textContent).toContain("We'll let you know");
    expect(vi.mocked(posthog.capture).mock.calls).toEqual([["premium_tapped", {}]]);
  });

  /** {@link openspec/specs/analytics/spec.md#scenario-a-failed-premium-tap} */
  it("is not sent when the interest route fails", async () => {
    await tap(500);
    expect(container.textContent).toContain("We couldn't save that");
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
