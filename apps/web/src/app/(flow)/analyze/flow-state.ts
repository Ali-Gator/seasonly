import type { QuizAnswers, RetakeReason, Traits } from "@seasonly/analysis";

import type { AnalyzeResponse } from "@/lib/analysis/request";

/**
 * The /analyze step machine, pure so it is unit-tested. A transition pushes the current step onto
 * `trail` (a new history entry) or replaces it; `back` pops. The check and the analysis are
 * replaced by their outcome, so Back never lands on a spinner.
 *
 * {@link openspec/specs/capture-flow/spec.md#requirement-the-flow-stays-on-one-url-and-back-returns-to-the-previous-step}
 */
export type Result = Extract<AnalyzeResponse, { kind: "result" }>;

export type Step =
  | { name: "guide" }
  | { name: "capture" }
  /** `id` ties the check's result to the photo that started it. */
  | { name: "checking"; id: number }
  | { name: "retake"; problem: RetakeReason; offerQuizOnly: boolean; previewUrl: string | null }
  | { name: "quiz"; question: number }
  | { name: "analyzing" }
  | { name: "reveal"; result: Result }
  /** The email step for a result with a report id. */
  | { name: "email"; result: Result }
  | { name: "no-result"; reason: "no-answers" | "answers-cancel" }
  /** `blocked`: the route answered 403, so sending again cannot work. */
  | { name: "error"; blocked?: true };

/** A photo that passed the check: what is sent once the quiz is finished. */
export interface PassedPhoto {
  traits: Traits;
  crop: Blob;
  cropUrl: string;
  /** The crop's outline, when the person segmenter made one. */
  mask?: Blob | null;
}

export interface AnalysisRequest {
  answers: QuizAnswers;
  photo: PassedPhoto | null;
}

export interface FlowState {
  step: Step;
  /** Earlier steps, newest last; one per browser history entry. */
  trail: Step[];
  photo: PassedPhoto | null;
  answers: QuizAnswers;
  /** Answered every question once this visit. */
  quizDone: boolean;
  /** Chose to continue without a photo; a passing photo ends it. */
  quizOnly: boolean;
  /** Failed checks in a row. */
  failures: number;
  /** The last request sent, re-sent by Try again. */
  request: AnalysisRequest | null;
  /** Bumped on every send, so the component sends once per bump. */
  attempt: number;
}

export const QUESTIONS = ["veins", "jewelry", "sun", "hair"] as const;
export type Question = (typeof QUESTIONS)[number];

export type FlowEvent =
  | { type: "open-camera" }
  /** `/analyze?start=camera`: the capture step takes the opening guide's place. */
  | { type: "start-camera" }
  | { type: "checking"; id: number }
  | ({ type: "checked"; id: number; previewUrl: string | null } & (
      { problem: null; photo: PassedPhoto } | { problem: RetakeReason; photo: null }
    ))
  | { type: "retake" }
  | { type: "quiz-only" }
  | { type: "answer"; question: Question; value: string }
  | { type: "next" }
  | { type: "change-answers" }
  | { type: "analyzed"; response: AnalyzeResponse }
  | { type: "failed"; blocked?: boolean }
  | { type: "try-again" }
  | { type: "open-email" }
  | { type: "back" };

export function initialState(): FlowState {
  return {
    step: { name: "guide" },
    trail: [],
    photo: null,
    answers: {},
    quizDone: false,
    quizOnly: false,
    failures: 0,
    request: null,
    attempt: 0,
  };
}

const push = (s: FlowState, step: Step): FlowState => ({
  ...s,
  step,
  trail: [...s.trail, s.step],
});
const replace = (s: FlowState, step: Step): FlowState => ({ ...s, step });

/**
 * The capture step the flow opens on from `?start=camera`, one object, so the component can tell
 * it from a step reached later: React re-runs the reducer, which would make a fresh one.
 */
export const CAMERA_START: Step = { name: "capture" };

/** Sends the request, as a new entry from the last question or in place of a spinner. */
const analyze = (s: FlowState, to: typeof push): FlowState => ({
  ...to(s, { name: "analyzing" }),
  request: { answers: s.answers, photo: s.photo },
  attempt: s.attempt + 1,
});

/** After a photo passes or is skipped: the quiz, or straight to the analysis once it is done. */
const afterPhoto = (s: FlowState, to: typeof push): FlowState =>
  s.quizDone ? analyze(s, to) : to(s, { name: "quiz", question: 0 });

export function reduce(s: FlowState, e: FlowEvent): FlowState {
  const { step } = s;
  switch (e.type) {
    case "open-camera":
      return push(s, { name: "capture" });
    case "start-camera":
      // Replaced, so Back from the camera leaves the flow; never once the person has moved on.
      // {@link openspec/specs/capture-flow/spec.md#requirement-the-landings-camera-link-opens-the-flow-on-the-camera}
      return step.name === "guide" && s.trail.length === 0 ? replace(s, CAMERA_START) : s;
    case "checking":
      // A second tap while checking adds no entry; its result is dropped by id.
      return step.name === "checking" ? s : push(s, { name: "checking", id: e.id });
    case "checked": {
      if (step.name !== "checking" || step.id !== e.id) return s;
      if (e.problem) {
        const failures = s.failures + 1;
        return replace(
          { ...s, failures, photo: null },
          {
            name: "retake",
            problem: e.problem,
            offerQuizOnly: failures >= 2,
            previewUrl: e.previewUrl,
          },
        );
      }
      // Replaced, so Back from the quiz skips the spinner. A passing photo ends quiz-only.
      return afterPhoto({ ...s, failures: 0, photo: e.photo, quizOnly: false }, replace);
    }
    case "retake":
      return push(s, { name: "capture" });
    case "quiz-only":
      return afterPhoto({ ...s, photo: null, quizOnly: true }, push);
    case "answer":
      return { ...s, answers: { ...s.answers, [e.question]: e.value } as QuizAnswers };
    case "next": {
      if (step.name !== "quiz" || !s.answers[QUESTIONS[step.question] as Question]) return s;
      if (step.question < QUESTIONS.length - 1)
        return push(s, { name: "quiz", question: step.question + 1 });
      // A photo that was rejected since is not replaced by the quiz alone without the offer.
      if (!s.photo && !s.quizOnly) return push({ ...s, quizDone: true }, { name: "capture" });
      return analyze({ ...s, quizDone: true }, push);
    }
    case "change-answers":
      return push(s, { name: "quiz", question: 0 });
    case "analyzed": {
      if (step.name !== "analyzing") return s;
      const r = e.response;
      if (r.kind === "result") return replace(s, { name: "reveal", result: r });
      if (r.kind === "no-result") return replace(s, { name: "no-result", reason: r.reason });
      const failures = s.failures + 1;
      return replace(
        { ...s, failures, photo: null },
        { name: "retake", problem: r.problem, offerQuizOnly: failures >= 2, previewUrl: null },
      );
    }
    case "failed":
      if (step.name !== "analyzing") return s;
      return replace(s, e.blocked ? { name: "error", blocked: true } : { name: "error" });
    case "try-again":
      // From the error screen, or from a reveal whose result was not saved.
      return step.name === "error" || (step.name === "reveal" && !step.result.reportId)
        ? { ...replace(s, { name: "analyzing" }), attempt: s.attempt + 1 }
        : s;
    case "open-email":
      return step.name === "reveal" && step.result.reportId
        ? push(s, { name: "email", result: step.result })
        : s;
    case "back": {
      const previous = s.trail.at(-1);
      if (!previous) return s;
      return { ...s, step: previous, trail: s.trail.slice(0, -1) };
    }
  }
}

/** The step progress's current index: Photo, Quiz, Result; none on the reveal or the email step. */
export function stepProgress(step: Step): number | null {
  if (step.name === "quiz") return 1;
  if (step.name === "analyzing" || step.name === "no-result" || step.name === "error") return 2;
  if (step.name === "reveal" || step.name === "email") return null;
  return 0;
}

/**
 * The analyze route's multipart body: the answers always, the traits with the crop only when
 * there is a photo, and the crop's outline only when the photo has one.
 *
 * {@link openspec/specs/capture-flow/spec.md#requirement-only-a-face-crop-is-uploaded}
 */
export function toFormData({ answers, photo }: AnalysisRequest): FormData {
  const form = new FormData();
  form.set("answers", JSON.stringify(answers));
  if (photo) {
    form.set("traits", JSON.stringify(photo.traits));
    form.set("crop", photo.crop, "crop.jpg");
    if (photo.mask) form.set("mask", photo.mask, "mask.png");
  }
  return form;
}
