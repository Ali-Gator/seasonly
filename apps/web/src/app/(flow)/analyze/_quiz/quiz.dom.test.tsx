// @vitest-environment jsdom
/**
 * `QuizStep` outside the flow: its heading level and its optional Back.
 *
 * @see openspec/specs/quiz/spec.md
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it } from "vitest";

import { QuizStep } from "./quiz";

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const render = (props: { heading?: "h1" | "h2"; onBack?: () => void }) => {
  const box = document.createElement("div");
  act(() =>
    createRoot(box).render(
      <QuizStep question={0} answers={{}} onAnswer={() => {}} onNext={() => {}} {...props} />,
    ),
  );
  return box;
};
const back = (box: HTMLElement) =>
  [...box.querySelectorAll("button")].find((b) => b.textContent === "Back");

describe("QuizStep", () => {
  /** {@link openspec/specs/quiz/spec.md#scenario-the-questions-on-the-quiz-page} */
  it("takes an h2 and no Back on the quiz page", () => {
    const box = render({ heading: "h2" });
    expect(box.querySelector("legend h2")?.textContent).toContain("veins");
    expect(box.querySelector("h1")).toBeNull();
    expect(back(box)).toBeUndefined();
  });

  /** {@link openspec/specs/quiz/spec.md#requirement-four-questions-in-canvas-order} */
  it("keeps the flow's h1 and Back by default", () => {
    const box = render({ onBack: () => {} });
    expect(box.querySelector("legend h1")?.getAttribute("tabindex")).toBe("-1");
    expect(back(box)).toBeDefined();
  });
});
