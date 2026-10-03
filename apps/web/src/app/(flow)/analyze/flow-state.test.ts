/**
 * The /analyze step machine. Each transition either pushes a history entry or replaces the
 * current one; Back pops. The component maps these onto the browser's history.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
import { describe, expect, it } from "vitest";

import {
  type FlowEvent,
  type FlowState,
  initialState,
  type PassedPhoto,
  reduce,
  stepProgress,
  toFormData,
} from "./flow-state";

const run = (events: FlowEvent[], state: FlowState = initialState()) =>
  events.reduce(reduce, state);

const crop = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
const PASS: PassedPhoto = {
  traits: { temperature: 0.4, value: 0, clarity: -0.8 },
  crop,
  cropUrl: "blob:crop",
};
const passed: FlowEvent = {
  type: "checked",
  id: 1,
  problem: null,
  photo: PASS,
  previewUrl: "blob:p",
};
const failed = (problem: "dark" | "no-face" = "dark"): FlowEvent => ({
  type: "checked",
  id: 1,
  problem,
  photo: null,
  previewUrl: "blob:p",
});
const answerAll: FlowEvent[] = [
  { type: "answer", question: "veins", value: "green" },
  { type: "next" },
  { type: "answer", question: "jewelry", value: "gold" },
  { type: "next" },
  { type: "answer", question: "sun", value: "tan" },
  { type: "next" },
  { type: "answer", question: "hair", value: "unsure" },
  { type: "next" },
];
/** Guide → upload → pass → consent → quiz done → analyzing. */
const toAnalyzing: FlowEvent[] = [
  { type: "checking", id: 1 },
  passed,
  { type: "agree" },
  ...answerAll,
];

describe("history", () => {
  /** {@link openspec/specs/capture-flow/spec.md#scenario-back-inside-the-quiz} */
  it("goes back from question 2 to question 1", () => {
    const q2 = run([
      { type: "checking", id: 1 },
      passed,
      { type: "agree" },
      ...answerAll.slice(0, 2),
    ]);
    expect(q2.step).toEqual({ name: "quiz", question: 1 });
    expect(reduce(q2, { type: "back" }).step).toEqual({ name: "quiz", question: 0 });
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-back-from-the-reveal} */
  it("replaces analyzing with its outcome, so Back from the reveal gives question 4", () => {
    const analyzing = run(toAnalyzing);
    expect(analyzing.step.name).toBe("analyzing");
    const reveal = reduce(analyzing, {
      type: "analyzed",
      response: {
        kind: "result",
        reportId: null,
        season: "soft-autumn",
        agreement: "agree",
        confidence: 0.5,
        photo: null,
        text: "cap-unavailable",
      },
    });
    expect(reveal.step.name).toBe("reveal");
    expect(reveal.trail).toHaveLength(analyzing.trail.length);
    expect(reduce(reveal, { type: "back" }).step).toEqual({ name: "quiz", question: 3 });
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-reload} */
  it("starts at the photo guide", () => {
    expect(initialState().step).toEqual({ name: "guide" });
    expect(initialState().trail).toEqual([]);
  });

  /** {@link openspec/specs/capture-flow/spec.md#requirement-the-flow-stays-on-one-url-and-back-returns-to-the-previous-step} */
  it("replaces the check with its outcome, so Back from consent skips it", () => {
    const consent = run([{ type: "open-camera" }, { type: "checking", id: 1 }, passed]);
    expect(consent.step.name).toBe("consent");
    expect(reduce(consent, { type: "back" }).step).toEqual({ name: "capture" });
  });

  it("ignores an answer that arrives after Back left analyzing", () => {
    const back = reduce(run(toAnalyzing), { type: "back" });
    expect(reduce(back, { type: "failed" })).toBe(back);
  });
});

describe("consent", () => {
  /** {@link openspec/specs/capture-flow/spec.md#scenario-consent-declined} */
  it("goes back to capture without a request when declined", () => {
    const state = run([{ type: "checking", id: 1 }, passed, { type: "decline" }]);
    expect(state.step).toEqual({ name: "capture" });
    expect(state.request).toBeNull();
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-consent-given} */
  it("starts the quiz when given, and builds the request only when the quiz is done", () => {
    const quiz = run([{ type: "checking", id: 1 }, passed, { type: "agree" }]);
    expect(quiz.step).toEqual({ name: "quiz", question: 0 });
    expect(quiz.request).toBeNull();
    expect(run(answerAll, quiz).request?.photo).toBe(PASS);
  });

  /** {@link openspec/specs/capture-flow/spec.md#requirement-nothing-leaves-the-device-before-consent} */
  it("is asked once per visit", () => {
    const again = run([
      { type: "checking", id: 1 },
      passed,
      { type: "agree" },
      { type: "retake" },
      { type: "checking", id: 1 },
      passed,
    ]);
    expect(again.step.name).not.toBe("consent");
  });
});

describe("retakes", () => {
  /** {@link openspec/specs/capture-flow/spec.md#scenario-first-failure} */
  it("offers only a retake and an upload after the first failure", () => {
    expect(run([{ type: "checking", id: 1 }, failed()]).step).toEqual({
      name: "retake",
      problem: "dark",
      offerQuizOnly: false,
      previewUrl: "blob:p",
    });
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-second-failure-in-a-row} */
  it("offers to continue without a photo after the second failure in a row, until a pass", () => {
    const twice = run([
      { type: "checking", id: 1 },
      failed(),
      { type: "checking", id: 1 },
      failed("no-face"),
    ]);
    expect(twice.step).toMatchObject({ name: "retake", problem: "no-face", offerQuizOnly: true });
    const reset = run(
      [{ type: "checking", id: 1 }, passed, { type: "checking", id: 1 }, failed()],
      twice,
    );
    expect(reset.step).toMatchObject({ name: "retake", offerQuizOnly: false });
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-continuing-without-a-photo} */
  it("sends the answers only on the quiz-only path", () => {
    const state = run([
      { type: "checking", id: 1 },
      failed(),
      { type: "checking", id: 1 },
      failed(),
      { type: "quiz-only" },
      ...answerAll,
    ]);
    expect(state.step.name).toBe("analyzing");
    expect(state.request).toEqual({
      answers: { veins: "green", jewelry: "gold", sun: "tan", hair: "unsure" },
      photo: null,
    });
    const form = toFormData(state.request ?? { answers: {}, photo: PASS });
    expect([...form.keys()]).toEqual(["answers"]);
  });

  it("sends the answers, the traits and the crop with a photo", () => {
    const form = toFormData(run(toAnalyzing).request ?? { answers: {}, photo: null });
    expect([...form.keys()]).toEqual(["answers", "traits", "crop"]);
    expect(JSON.parse(form.get("traits") as string)).toEqual(PASS.traits);
  });
});

describe("quiz", () => {
  /** {@link openspec/specs/quiz/spec.md#scenario-a-fresh-question} */
  it("selects nothing on a fresh question and blocks Next until an answer", () => {
    const q2 = run([
      { type: "checking", id: 1 },
      passed,
      { type: "agree" },
      ...answerAll.slice(0, 2),
    ]);
    expect(q2.answers.jewelry).toBeUndefined();
    expect(reduce(q2, { type: "next" })).toBe(q2);
  });

  /** {@link openspec/specs/quiz/spec.md#scenario-back-to-an-answered-question} */
  it("keeps an answer through Back", () => {
    const q3 = run([
      { type: "checking", id: 1 },
      passed,
      { type: "agree" },
      ...answerAll.slice(0, 4),
    ]);
    const back = reduce(q3, { type: "back" });
    expect(back.step).toEqual({ name: "quiz", question: 1 });
    expect(back.answers.jewelry).toBe("gold");
  });

  /** {@link openspec/specs/quiz/spec.md#scenario-a-retake-after-the-quiz} */
  it("keeps the answers through a rejection and goes straight to analyzing after a retake", () => {
    const rejected = reduce(run(toAnalyzing), {
      type: "analyzed",
      response: { kind: "rejected", problem: "several-faces" },
    });
    expect(rejected.step).toMatchObject({ name: "retake", problem: "several-faces" });
    const again = run([{ type: "retake" }, { type: "checking", id: 1 }, passed], rejected);
    expect(again.step.name).toBe("analyzing");
    expect(again.request?.answers).toEqual(run(toAnalyzing).request?.answers);
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-retake-from-the-reveal} */
  it("keeps the answers through Retake my photo", () => {
    const reveal = reduce(run(toAnalyzing), {
      type: "analyzed",
      response: {
        kind: "result",
        reportId: "x",
        season: "soft-autumn",
        agreement: "agree",
        confidence: 0.5,
        photo: "ok",
        text: "personal",
      },
    });
    const capture = reduce(reveal, { type: "retake" });
    expect(capture.step).toEqual({ name: "capture" });
    expect(capture.answers).toEqual(reveal.answers);
  });

  /** {@link openspec/specs/season-reveal/spec.md#requirement-quiz-answers-with-nothing-to-classify-show-a-no-result-screen} */
  it("shows no-result, and Change my answers returns to question 1", () => {
    const none = reduce(run(toAnalyzing), {
      type: "analyzed",
      response: { kind: "no-result", reason: "answers-cancel" },
    });
    expect(none.step).toEqual({ name: "no-result", reason: "answers-cancel" });
    expect(reduce(none, { type: "change-answers" }).step).toEqual({ name: "quiz", question: 0 });
  });
});

describe("errors", () => {
  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-route-refuses-the-request} */
  it("shows the error screen on a failure, and Try again re-sends the same request", () => {
    const analyzing = run(toAnalyzing);
    const error = reduce(analyzing, { type: "failed" });
    expect(error.step).toEqual({ name: "error" });
    const retry = reduce(error, { type: "try-again" });
    expect(retry.step.name).toBe("analyzing");
    expect(retry.request).toBe(analyzing.request);
    expect(retry.attempt).toBe(analyzing.attempt + 1);
    expect(reduce(retry, { type: "back" }).step).toEqual({ name: "quiz", question: 3 });
  });
});

describe("step progress", () => {
  /** {@link openspec/specs/quiz/spec.md#requirement-four-questions-in-canvas-order} */
  it("marks Photo up to consent, Quiz in the quiz and Result while analyzing, none on the reveal", () => {
    expect(stepProgress({ name: "guide" })).toBe(0);
    expect(stepProgress({ name: "quiz", question: 2 })).toBe(1);
    expect(stepProgress({ name: "analyzing" })).toBe(2);
    expect(stepProgress({ name: "reveal", result: {} as never })).toBeNull();
  });
});

describe("review fixes", () => {
  /** {@link openspec/specs/capture-flow/spec.md#scenario-consent-declined} */
  it("asks for consent again after it was declined", () => {
    const state = run([
      { type: "checking", id: 1 },
      passed,
      { type: "agree" },
      { type: "back" },
      { type: "decline" },
      { type: "checking", id: 1 },
      passed,
    ]);
    expect(state.step.name).toBe("consent");
  });

  /** {@link openspec/specs/capture-flow/spec.md#requirement-nothing-leaves-the-device-before-consent} */
  it("shows capture, not an empty consent, when Back reaches consent for a dropped photo", () => {
    const state = run([
      { type: "checking", id: 1 },
      passed,
      { type: "decline" },
      { type: "checking", id: 1 },
      failed(),
      { type: "back" },
      { type: "back" },
    ]);
    expect(state.step).toEqual({ name: "capture" });
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-first-failure} */
  it("asks for a new photo, not a quiz-only send, after Back from a rejection", () => {
    const rejected = reduce(run(toAnalyzing), {
      type: "analyzed",
      response: { kind: "rejected", problem: "no-face" },
    });
    const state = run([{ type: "back" }, { type: "next" }], rejected);
    expect(state.step).toEqual({ name: "capture" });
    const again = run(
      [
        { type: "checking", id: 2 },
        { ...passed, id: 2 },
      ],
      state,
    );
    expect(again.step.name).toBe("analyzing");
    expect(again.request?.photo).toBe(PASS);
  });

  /** {@link openspec/specs/capture-flow/spec.md#requirement-every-photo-is-checked-on-the-device-before-anything-is-uploaded} */
  it("drops a result from an earlier check and a second tap while checking", () => {
    const first = run([{ type: "checking", id: 1 }]);
    expect(reduce(first, { type: "checking", id: 2 })).toBe(first);
    const second = run([{ type: "back" }, { type: "checking", id: 2 }], first);
    expect(reduce(second, passed)).toBe(second);
    expect(reduce(second, { ...passed, id: 2 }).step.name).toBe("consent");
  });
});
