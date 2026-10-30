/**
 * The quiz page's step machine and its link to the photo.
 *
 * @see openspec/specs/quiz-page/spec.md
 */
import { describe, expect, it } from "vitest";

import { change, handoffHref, next, popped, type QuizPageState, restore, START } from "./state";

const ANSWERS = { veins: "green", jewelry: "gold", sun: "burn-tan", hair: "dark" } as const;

describe("moving through the quiz", () => {
  /** {@link openspec/specs/quiz-page/spec.md#requirement-each-quiz-page-step-is-a-browser-history-entry-that-keeps-the-answers} */
  it("goes forward question by question to the result, keeping the answers", () => {
    let state: QuizPageState = { ...START, answers: ANSWERS };
    for (const step of [1, 2, 3, "result"]) {
      state = next(state);
      expect(state).toEqual({ step, answers: ANSWERS });
    }
    expect(next(state)).toBe(state);
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-last-question-waits-for-the-person} */
  it("does not move on from a question with no answer", () => {
    expect(next(START)).toBe(START);
    const state = { step: 3, answers: { veins: "green" } } as const;
    expect(next(state)).toBe(state);
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-back-inside-the-quiz} */
  it("takes the step from the entry Back lands on and keeps the newest answers", () => {
    const entry = { __NA: true, quizPage: { step: 1, answers: { veins: "green" } } };
    expect(popped({ step: 2, answers: ANSWERS }, entry)).toEqual({ step: 1, answers: ANSWERS });
  });

  /** {@link openspec/specs/quiz-page/spec.md#requirement-each-quiz-page-step-is-a-browser-history-entry-that-keeps-the-answers} */
  it("fills in what the entry holds and the screen does not, as after a reload", () => {
    const entry = { quizPage: { step: "result", answers: ANSWERS } };
    expect(popped({ step: 0, answers: { veins: "blue" } }, entry)).toEqual({
      step: "result",
      answers: { ...ANSWERS, veins: "blue" },
    });
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-back-inside-the-quiz} */
  it("shows question 1 on the entry the page opened on, which may hold nothing", () => {
    expect(popped({ step: 1, answers: ANSWERS }, { __NA: true })).toEqual({
      step: 0,
      answers: ANSWERS,
    });
    expect(popped({ step: 1, answers: ANSWERS }, null)).toEqual({ step: 0, answers: ANSWERS });
  });

  /** {@link openspec/specs/quiz-page/spec.md#scenario-changing-the-answers} */
  it("goes back to question 1 with every answer kept", () => {
    expect(change({ step: "result", answers: ANSWERS })).toEqual({ step: 0, answers: ANSWERS });
  });
});

describe("restoring from history", () => {
  /**
   * {@link openspec/specs/quiz-page/spec.md#scenario-back-from-the-photo-guide-returns-to-the-result}
   * {@link openspec/specs/quiz-page/spec.md#scenario-reload-on-the-result}
   */
  it("accepts a valid entry", () => {
    const quizPage = { step: "result", answers: ANSWERS };
    expect(restore({ __NA: true, quizPage })).toEqual(quizPage);
    expect(restore({ quizPage: { step: 2, answers: { veins: "unsure" } } })).toEqual({
      step: 2,
      answers: { veins: "unsure" },
    });
  });

  /** {@link openspec/specs/quiz-page/spec.md#requirement-each-quiz-page-step-is-a-browser-history-entry-that-keeps-the-answers} */
  it.each([
    [null],
    [{}],
    [{ quizPage: "result" }],
    [{ quizPage: { step: 4, answers: {} } }],
    [{ quizPage: { step: -1, answers: {} } }],
    [{ quizPage: { step: 1.5, answers: {} } }],
    [{ quizPage: { step: "done", answers: ANSWERS } }],
    [{ quizPage: { step: 1, answers: { veins: "purple" } } }],
    [{ quizPage: { step: 1 } }],
    // A result needs all four: its link carries them.
    [{ quizPage: { step: "result", answers: { veins: "green" } } }],
  ])("refuses %j", (raw) => {
    expect(restore(raw)).toBeNull();
  });
});

describe("the link to the photo", () => {
  /** {@link openspec/specs/quiz-page/spec.md#scenario-the-selfie-link-carries-the-answers} */
  it("carries the four answers in order", () => {
    expect(handoffHref(ANSWERS)).toBe("/analyze?veins=green&jewelry=gold&sun=burn-tan&hair=dark");
  });

  /** {@link openspec/specs/quiz-page/spec.md#requirement-the-photo-is-the-next-step-with-the-answers-kept} */
  it("carries unsure as given", () => {
    expect(handoffHref({ veins: "unsure", jewelry: "unsure", sun: "unsure", hair: "unsure" })).toBe(
      "/analyze?veins=unsure&jewelry=unsure&sun=unsure&hair=unsure",
    );
  });
});
