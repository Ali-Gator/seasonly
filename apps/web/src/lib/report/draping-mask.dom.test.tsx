// @vitest-environment jsdom
/**
 * The draping preview's cut-out, in a DOM, with the outline's fetch stubbed.
 *
 * @see openspec/specs/report-page/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ReportDraping } from "./draping";

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const DELETED = "We couldn't load your photo, so this shows the two colors only.";
const HIDDEN = "sn-face-pending";
let root: Root;
let container: HTMLDivElement;
let answer: (response: Response | Error) => void;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve, reject) => {
          answer = (r) => (r instanceof Error ? reject(r) : resolve(r));
        }),
    ),
  );
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async (blob: Blob) => {
      if ((await blob.text()) === "corrupt") throw new Error("cannot decode");
      return { close: vi.fn() };
    }),
  );
  URL.createObjectURL = vi.fn(() => "blob:mask");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const swatch = (name: string, hex: string) => ({ name, hex });
  await act(async () =>
    root.render(
      <ReportDraping
        id={ID}
        best={swatch("Rust", "#B7410E")}
        worst={swatch("Icy pink", "#F4D7E3")}
      />,
    ),
  );
}

const wrapper = () => container.firstElementChild as HTMLElement;
const slots = () => [...container.querySelectorAll<HTMLElement>(".sn-drape__face")];

describe("ReportDraping's cut-out", () => {
  /** {@link openspec/specs/report-page/spec.md#requirement-the-draping-preview-cuts-the-stored-face-out-of-its-background} */
  it("hides the face images while the outline is loading", async () => {
    await render();
    expect(fetch).toHaveBeenCalledWith(`/api/face/${ID}/mask`, {
      signal: expect.any(AbortSignal),
    });
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(wrapper().className).toContain(HIDDEN);
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-a-stored-outline} */
  it("masks both faces with the loaded outline, then shows them", async () => {
    await render();
    await act(async () => answer(new Response(new Blob(["png"]), { status: 200 })));
    expect(wrapper().className).not.toContain(HIDDEN);
    expect(slots()).toHaveLength(2);
    for (const slot of slots()) {
      expect(slot.classList).toContain("sn-drape__face--cut");
      expect(slot.style.getPropertyValue("--sn-face-mask")).toBe('url("blob:mask")');
    }
    act(() => root.unmount());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mask");
    root = createRoot(container);
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-no-outline} */
  it("shows the face unmasked, without the couldn't-load line, when the outline is missing, fails or does not decode", async () => {
    for (const response of [
      new Response("Not found", { status: 404 }),
      new Error("offline"),
      new Response("corrupt", { status: 200 }),
    ]) {
      await render();
      await act(async () => answer(response));
      expect(wrapper().className).not.toContain(HIDDEN);
      expect(container.querySelectorAll("img")).toHaveLength(2);
      expect(container.querySelector(".sn-drape__face--cut")).toBeNull();
      expect(container.textContent).not.toContain(DELETED);
      act(() => root.unmount());
      container.remove();
    }
    root = createRoot((container = document.createElement("div")));
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-neither-is-stored} */
  it("still says the photo could not load when the face fails too", async () => {
    await render();
    await act(async () => answer(new Response("Not found", { status: 404 })));
    await act(async () => container.querySelector("img")?.dispatchEvent(new Event("error")));
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.textContent).toContain(DELETED);
  });

  /** {@link openspec/specs/report-page/spec.md#requirement-the-draping-preview-cuts-the-stored-face-out-of-its-background} */
  it("shows the faces after 4 s without a script, so a hung outline never hides them", () => {
    const css = fs
      .readFileSync(path.resolve(import.meta.dirname, "../../app/globals.css"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(
      /\.sn-face-pending img\s*\{[^}]*visibility:\s*hidden;[^}]*sn-face-reveal 0s 4s forwards/,
    );
    expect(css).toMatch(/@keyframes sn-face-reveal\s*\{\s*to\s*\{\s*visibility:\s*visible/);
  });
});
