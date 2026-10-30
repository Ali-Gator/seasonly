// @vitest-environment jsdom
/**
 * The quiz page's island in a DOM: the four questions, history, the result in the browser and its
 * one event. `QuizStep`, `quizResult` and history are real; analytics is a spy.
 *
 * @see openspec/specs/quiz-page/spec.md
 */
import { QUIZ_VALUES, type QuizAnswers } from "@seasonly/analysis";
import type { ReactNode } from "react";
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { track } from "@/lib/analytics";
import { quizResult } from "@/lib/mcp/result";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { QuizPage, QuizResult } = await import("./quiz-page");

const PATH = "/color-analysis-quiz";
const QUESTION_1 = "Look at the veins on your inner wrist in daylight. What color are they?";
const QUESTION_2 =
  "Hold gold and silver jewelry against your skin. Which one looks more natural on you?";
const QUESTION_3 = "What does your skin do in the sun without sunscreen?";
const SUMMER = ["Blue or purple", "Silver", "Burns, rarely tans", "Blonde"];

let root: Root;
let container: HTMLDivElement;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const mount = () =>
  act(async () =>
    root.render(
      <StrictMode>
        <QuizPage />
      </StrictMode>,
    ),
  );

beforeEach(async () => {
  vi.mocked(track).mockClear();
  history.replaceState(null, "", PATH);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await mount();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const heading = () => container.querySelector("h2")?.textContent;
const button = (name: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === name);
const link = (name: string) =>
  [...container.querySelectorAll("a")].find((a) => a.textContent?.trim() === name);
const option = (label: string) =>
  [...container.querySelectorAll<HTMLLabelElement>("label.sn-quiz")]
    .find((l) => l.querySelector(".sn-quiz__label")?.textContent === label)
    ?.querySelector("input");
const choose = (label: string, detail = 1) =>
  act(() => {
    option(label)?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail }));
  });
/** Answers each question with a tap and moves on, without waiting for the tap's timer. */
const answer = (labels: string[]) => {
  for (const label of labels) {
    choose(label);
    act(() => (button("Next") ?? button("See my result"))?.click());
  }
};
/** What the browser does on Back or Forward, for the entry it lands on. */
const pop = (state: unknown) =>
  act(() => {
    history.replaceState(state, "");
    dispatchEvent(new PopStateEvent("popstate", { state }));
  });
const remount = async () => {
  act(() => root.unmount());
  root = createRoot(container);
  await mount();
};

describe("the questions", () => {
  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-page-opens-on-question-1} */
  it("opens on question 1 with an h2 legend, nothing chosen, no Back and no focus moved", () => {
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("legend h2")?.textContent).toBe(QUESTION_1);
    expect(container.textContent).toContain("Question 1 of 4");
    expect(container.textContent).not.toContain("Step 2 of 3");
    expect(container.querySelector("input:checked")).toBeNull();
    expect(button("Back")).toBeUndefined();
    expect(document.activeElement).toBe(document.body);
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-a-tap-moves-on-as-in-the-flow} */
  it("moves on about 300 ms after a tap, with Back and focus on the new question", () => {
    vi.useFakeTimers();
    choose("Green or olive");
    expect(heading()).toBe(QUESTION_1);
    act(() => vi.advanceTimersByTime(300));
    expect(heading()).toBe(QUESTION_2);
    expect(container.textContent).toContain("Question 2 of 4");
    expect(button("Back")).toBeDefined();
    expect(document.activeElement).toBe(container.querySelector("h2"));
  });

  /** {@link openspec/specs/quiz-page/spec.md#requirement-the-quiz-page-asks-the-four-questions-in-its-first-screen} */
  it("does not move on after a keyboard choice", () => {
    vi.useFakeTimers();
    choose("Green or olive", 0);
    act(() => vi.advanceTimersByTime(1000));
    expect(heading()).toBe(QUESTION_1);
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-last-question-waits-for-the-person} */
  it("waits on question 4 until See my result", () => {
    vi.useFakeTimers();
    answer(SUMMER.slice(0, 3));
    expect(button("See my result")?.disabled).toBe(true);
    choose("Blonde");
    act(() => vi.advanceTimersByTime(1000));
    expect(container.textContent).toContain("Question 4 of 4");
    expect(button("See my result")?.disabled).toBe(false);
  });
});

describe("history", () => {
  /** {@link openspec/specs/quiz-page/spec.md#requirement-each-quiz-page-step-is-a-browser-history-entry-that-keeps-the-answers} */
  it("adds one entry per step and keeps the address", () => {
    const before = history.length;
    answer(SUMMER);
    expect(history.length).toBe(before + 4);
    expect(location.pathname).toBe(PATH);
    expect(history.state.quizPage.step).toBe("result");
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-back-inside-the-quiz} */
  it("shows question 2 with its answer chosen on Back from question 3", () => {
    answer(SUMMER.slice(0, 2));
    expect(heading()).toBe(QUESTION_3);
    pop({ quizPage: { step: 1, answers: { veins: "blue" } } });
    expect(heading()).toBe(QUESTION_2);
    expect(option("Silver")?.checked).toBe(true);
    expect(location.pathname).toBe(PATH);
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-back-inside-the-quiz} */
  it("offers Back on question 2, and the entry the page opened on shows question 1", () => {
    answer(SUMMER.slice(0, 1));
    const back = vi.spyOn(history, "back").mockImplementation(() => {});
    act(() => button("Back")?.click());
    expect(back).toHaveBeenCalledOnce();
    back.mockRestore();
    pop(null);
    expect(heading()).toBe(QUESTION_1);
    expect(option("Blue or purple")?.checked).toBe(true);
  });

  /** {@link openspec/specs/quiz-page/spec.md#requirement-each-quiz-page-step-is-a-browser-history-entry-that-keeps-the-answers} */
  it("keeps a question's answer in its own entry, for a return from another page", async () => {
    choose("Green or olive", 0);
    await remount();
    expect(heading()).toBe(QUESTION_1);
    expect(option("Green or olive")?.checked).toBe(true);
  });

  /**
   * {@link openspec/specs/quiz-page/spec.md#scenario-back-from-the-photo-guide-returns-to-the-result}
   * {@link openspec/specs/quiz-page/spec.md#scenario-reload-on-the-result}
   * {@link openspec/specs/analytics/spec.md#scenario-the-result-shown-again}
   */
  it("shows the same result on a remount, without focus or a second event", async () => {
    answer(SUMMER);
    vi.mocked(track).mockClear();
    await remount();
    expect(heading()).toBe("Summer");
    expect(document.activeElement).toBe(document.body);
    expect(track).not.toHaveBeenCalled();
  });
});

describe("the result", () => {
  /**
   * {@link openspec/specs/quiz-page/spec.md#scenario-a-summer-result}
   * {@link openspec/specs/quiz-page/spec.md#scenario-the-selfie-link-carries-the-answers}
   */
  it("names the family with its copy, 6 colors, the note and the link", () => {
    answer(SUMMER);
    const { structured } = quizResult({
      veins: "blue",
      jewelry: "silver",
      sun: "burn",
      hair: "blonde",
    });
    if (structured.kind !== "season") throw new Error("expected a season");
    expect(heading()).toBe("Summer");
    expect(container.textContent).toContain(structured.tagline);
    expect(container.textContent).toContain(structured.revealLine);
    expect(structured.colors).toHaveLength(6);
    for (const { name, hex } of structured.colors) {
      expect(container.textContent).toContain(name);
      expect(container.textContent).toContain(hex);
    }
    expect(container.textContent).toContain(
      "From the quiz alone. A selfie gives your exact season and all 30 colors.",
    );
    expect(link("Add a selfie for your exact season")?.getAttribute("href")).toBe(
      "/analyze?veins=blue&jewelry=silver&sun=burn&hair=blonde",
    );
    expect(document.activeElement).toBe(container.querySelector("h2"));
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-nothing-is-sent} */
  it("sends nothing", () => {
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    answer(SUMMER);
    expect(send).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-every-answer-is-hard-to-tell} */
  it("gives the no-answers message for four Hard to tell", () => {
    answer(["Hard to tell", "Hard to tell", "Hard to tell", "Hard to tell"]);
    const { structured } = quizResult({
      veins: "unsure",
      jewelry: "unsure",
      sun: "unsure",
      hair: "unsure",
    });
    if (structured.kind !== "no-result") throw new Error("expected no result");
    expect(heading()).toBe("These answers don't point to one season");
    expect(container.textContent).toContain(structured.message);
    expect(container.textContent).toContain("“Hard to tell”");
    expect(container.querySelector(".sn-swatch-grid")).toBeNull();
    expect(link("Let a selfie read your colors")?.getAttribute("href")).toBe(
      "/analyze?veins=unsure&jewelry=unsure&sun=unsure&hair=unsure",
    );
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-answers-that-cancel-out} */
  it("gives the answers-cancel message", () => {
    answer(["Green or olive", "Silver", "Hard to tell", "Hard to tell"]);
    expect(container.textContent).toContain("Your answers point in opposite directions");
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-changing-the-answers} */
  it("goes back to question 1 on Change my answers, with the answers chosen, as a new entry", () => {
    answer(SUMMER);
    const before = history.length;
    act(() => button("Change my answers")?.click());
    expect(heading()).toBe(QUESTION_1);
    expect(option("Blue or purple")?.checked).toBe(true);
    expect(history.length).toBe(before + 1);
    expect(document.activeElement).toBe(container.querySelector("h2"));
  });
});

describe("the event", () => {
  /** {@link openspec/specs/analytics/spec.md#scenario-a-result-on-the-quiz-page} */
  it("sends one quiz_page_completed with the family only", () => {
    answer(SUMMER);
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith("quiz_page_completed", { result: "summer" });
  });

  /** {@link openspec/specs/analytics/spec.md#scenario-a-no-result-on-the-quiz-page} */
  it("sends the reason when there is no result", () => {
    answer(["Hard to tell", "Hard to tell", "Hard to tell", "Hard to tell"]);
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith("quiz_page_completed", { result: "no-answers" });
  });

  /** {@link openspec/specs/analytics/spec.md#requirement-the-quiz-page-reports-its-result-without-the-answers} */
  it("sends nothing before See my result", () => {
    answer(SUMMER.slice(0, 3));
    choose("Blonde");
    expect(track).not.toHaveBeenCalled();
  });
});

describe("the page and the plugin", () => {
  /** Every combination of the four answers, each value or missing: 5 × 5 × 5 × 6. */
  const ALL: QuizAnswers[] = (() => {
    let combos: QuizAnswers[] = [{}];
    for (const [question, values] of Object.entries(QUIZ_VALUES))
      combos = combos.flatMap((c) => [c, ...values.map((v) => ({ ...c, [question]: v }))]);
    return combos;
  })();

  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-page-and-the-plugin-agree} */
  it("agree on all 750 combinations", () => {
    expect(ALL).toHaveLength(750);
    const box = document.createElement("div");
    const view = createRoot(box);
    for (const answers of ALL) {
      act(() => view.render(<QuizResult answers={answers} onChange={() => {}} />));
      const { structured } = quizResult(answers);
      const title = box.querySelector("h2")?.textContent;
      const hexes = [...box.querySelectorAll(".sn-swatch__hex")].map((h) => h.textContent);
      if (structured.kind === "season") {
        expect(title).toBe(structured.family);
        expect(hexes).toEqual(structured.colors.map((c) => c.hex));
      } else {
        expect(title).toBe(structured.title);
        expect(box.textContent).toContain(structured.message);
        expect(hexes).toEqual([]);
      }
    }
    act(() => view.unmount());
  });
});
