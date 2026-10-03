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
  | { name: "consent" }
  | { name: "quiz"; question: number }
  | { name: "analyzing" }
  | { name: "reveal"; result: Result }
  | { name: "no-result"; reason: "no-answers" | "answers-cancel" }
  | { name: "error" };

/** A photo that passed the check: what is sent after consent. */
export interface PassedPhoto {
  traits: Traits;
  crop: Blob;
  cropUrl: string;
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
  consented: boolean;
  /** The last request sent, re-sent by Try again. */
  request: AnalysisRequest | null;
  /** Bumped on every send, so the component sends once per bump. */
  attempt: number;
}

export const QUESTIONS = ["veins", "jewelry", "sun", "hair"] as const;
export type Question = (typeof QUESTIONS)[number];

export type FlowEvent =
  | { type: "open-camera" }
  | { type: "checking"; id: number }
  | {
      type: "checked";
      id: number;
      problem: RetakeReason | null;
      photo: PassedPhoto | null;
      previewUrl: string | null;
    }
  | { type: "agree" }
  | { type: "decline" }
  | { type: "retake" }
  | { type: "quiz-only" }
  | { type: "answer"; question: Question; value: string }
  | { type: "next" }
  | { type: "change-answers" }
  | { type: "analyzed"; response: AnalyzeResponse }
  | { type: "failed" }
  | { type: "try-again" }
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
    consented: false,
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
    case "checking":
      // A second tap while checking adds no entry; its result is dropped by id.
      return step.name === "checking" ? s : push(s, { name: "checking", id: e.id });
    case "checked": {
      if (step.name !== "checking" || step.id !== e.id) return s;
      if (e.problem || !e.photo) {
        const failures = s.failures + 1;
        return replace(
          { ...s, failures, photo: null },
          {
            name: "retake",
            problem: e.problem ?? "no-face",
            offerQuizOnly: failures >= 2,
            previewUrl: e.previewUrl,
          },
        );
      }
      const next = { ...s, failures: 0, photo: e.photo };
      // Quiz-only ends only once the photo is kept, not when it might still be declined.
      return next.consented
        ? afterPhoto({ ...next, quizOnly: false }, replace)
        : replace(next, { name: "consent" });
    }
    case "agree":
      return step.name === "consent"
        ? afterPhoto({ ...s, consented: true, quizOnly: false }, push)
        : s;
    case "decline":
      // The person said no: the photo is dropped and the next pass asks again. Replaced, so
      // Back does not land on the consent it just left.
      return replace({ ...s, photo: null, consented: false }, { name: "capture" });
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
      return step.name === "analyzing" ? replace(s, { name: "error" }) : s;
    case "try-again":
      return step.name === "error"
        ? { ...replace(s, { name: "analyzing" }), attempt: s.attempt + 1 }
        : s;
    case "back": {
      const previous = s.trail.at(-1);
      if (!previous) return s;
      // Consent for a photo that was since dropped has nothing to show: take a new one.
      const to: Step = previous.name === "consent" && !s.photo ? { name: "capture" } : previous;
      return { ...s, step: to, trail: s.trail.slice(0, -1) };
    }
  }
}

/** The step progress's current index: Photo, Quiz, Result; none on the reveal. */
export function stepProgress(step: Step): number | null {
  if (step.name === "quiz") return 1;
  if (step.name === "analyzing" || step.name === "no-result" || step.name === "error") return 2;
  if (step.name === "reveal") return null;
  return 0;
}

/**
 * The analyze route's multipart body: the answers always, and the traits with the crop only
 * when there is a photo.
 *
 * {@link openspec/specs/capture-flow/spec.md#requirement-only-a-face-crop-is-uploaded}
 */
export function toFormData({ answers, photo }: AnalysisRequest): FormData {
  const form = new FormData();
  form.set("answers", JSON.stringify(answers));
  if (photo) {
    form.set("traits", JSON.stringify(photo.traits));
    form.set("crop", photo.crop, "crop.jpg");
  }
  return form;
}
