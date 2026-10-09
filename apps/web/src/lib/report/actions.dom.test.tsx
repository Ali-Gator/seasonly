// @vitest-environment jsdom
/**
 * The report's share and save buttons, clicked in jsdom, with PostHog mocked as loaded.
 *
 * @see openspec/specs/analytics/spec.md
 */
import posthog from "posthog-js";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SaveButton, ShareButton } from "./actions";

vi.mock("posthog-js", () => ({ default: { __loaded: true, capture: vi.fn() } }));

const ALTS = { story: "Story card", post: "Post card" };

let root: Root;
let container: HTMLDivElement;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has neither, and both paths would throw before the event.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  URL.createObjectURL = () => "blob:palette";
  URL.revokeObjectURL = () => {};
  // A link click would navigate, which jsdom does not implement.
  document.addEventListener("click", (e) => e.preventDefault());
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, blob: async () => new Blob(["png"]) })),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  for (const key of ["share", "canShare"] as const)
    Object.defineProperty(navigator, key, { configurable: true, value: undefined });
});

async function render(ui: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(ui));
}

/** A share sheet that takes files, and settles as `share` does. */
function shareSheet(share: () => Promise<void>) {
  const fn = vi.fn(share);
  Object.defineProperty(navigator, "share", { configurable: true, value: fn });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  return fn;
}

const button = (name: string) => {
  const found = [...container.querySelectorAll("button")].find((b) => b.textContent === name);
  if (!found) throw new Error(`no button "${name}"`);
  return found;
};
/** Clicks, then lets the handler's awaits settle. */
const click = (el: HTMLElement) =>
  act(async () => {
    el.click();
    await new Promise((r) => setTimeout(r, 0));
  });
const events = () => vi.mocked(posthog.capture).mock.calls;

describe("share events", () => {
  /** {@link openspec/specs/analytics/spec.md#scenario-sharing-from-a-phone} */
  it("sends share_tapped shared from the actions' Share my season", async () => {
    const share = shareSheet(async () => {});
    await render(<ShareButton slug="soft-autumn" season="Soft Autumn" alts={ALTS} />);
    await click(button("Share my season"));
    expect(share).toHaveBeenCalledOnce();
    expect(events()).toEqual([["share_tapped", { place: "actions", outcome: "shared" }]]);
  });

  /** {@link openspec/specs/analytics/spec.md#requirement-share-and-save-events-carry-how-they-ended} */
  it("sends cancelled from the header's Share when the sheet is closed", async () => {
    shareSheet(async () => {
      throw new DOMException("closed", "AbortError");
    });
    await render(
      <ShareButton
        slug="soft-autumn"
        season="Soft Autumn"
        alts={ALTS}
        label="Share"
        variant="ghost"
        block={false}
        place="header"
      />,
    );
    await click(button("Share"));
    expect(events()).toEqual([["share_tapped", { place: "header", outcome: "cancelled" }]]);
  });

  /** {@link openspec/specs/analytics/spec.md#scenario-sharing-from-a-laptop} */
  it("sends panel, then share_card_downloaded for the post card's Download", async () => {
    await render(<ShareButton slug="soft-autumn" season="Soft Autumn" alts={ALTS} />);
    await click(button("Share my season"));
    expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(true);
    const download = container.querySelector<HTMLElement>('a[download$="-post.png"]');
    if (!download) throw new Error("no post Download");
    await click(download);
    expect(events()).toEqual([
      ["share_tapped", { place: "actions", outcome: "panel" }],
      ["share_card_downloaded", { ratio: "post" }],
    ]);
  });
});

describe("palette_saved", () => {
  /** {@link openspec/specs/analytics/spec.md#requirement-share-and-save-events-carry-how-they-ended} */
  it("sends share-sheet when the sheet takes the palette", async () => {
    shareSheet(async () => {});
    await render(<SaveButton slug="soft-autumn" />);
    await click(button("Save my palette"));
    expect(events()).toEqual([["palette_saved", { method: "share-sheet" }]]);
  });

  /** {@link openspec/specs/analytics/spec.md#scenario-saving-by-download} */
  it("sends download in a browser that cannot share files", async () => {
    await render(<SaveButton slug="soft-autumn" />);
    await click(button("Save my palette"));
    expect(events()).toEqual([["palette_saved", { method: "download" }]]);
  });

  /** {@link openspec/specs/analytics/spec.md#requirement-share-and-save-events-carry-how-they-ended} */
  it("sends nothing when the sheet is cancelled", async () => {
    const share = shareSheet(async () => {
      throw new DOMException("closed", "AbortError");
    });
    await render(<SaveButton slug="soft-autumn" />);
    await click(button("Save my palette"));
    expect(share).toHaveBeenCalledOnce();
    expect(events()).toEqual([]);
  });
});
