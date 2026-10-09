// @vitest-environment jsdom
/**
 * BL-09: the draping preview's switch to the two colors when the face image fails, in a DOM.
 *
 * @see openspec/specs/report-page/spec.md
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { ReportDraping } from "./draping";

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const DELETED = "Your photo has been deleted, so this shows the two colors only.";
let root: Root;
let container: HTMLDivElement;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ReportDraping", () => {
  /** {@link openspec/specs/report-page/spec.md#scenario-the-crop-is-gone} */
  it("shows the two colors alone once the face image fails to load", async () => {
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
    const [face, other] = container.querySelectorAll("img");
    expect(other).toBeDefined();
    expect(face?.getAttribute("src")).toBe(`/api/face/${ID}`);
    expect(container.textContent).not.toContain(DELETED);

    await act(async () => face?.dispatchEvent(new Event("error")));
    expect(container.querySelectorAll("img").length).toBe(0);
    expect(container.textContent).toContain(DELETED);
  });
});
