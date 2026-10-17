"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react";

import { StepProgress } from "@/components/ds";
import type { AnalyzeResponse } from "@/lib/analysis/request";
import { photoCheckedProps, track } from "@/lib/capture/events";
import { loadVision } from "@/lib/capture/mediapipe";
import { checkImage } from "@/lib/capture/photo";
import { familyName } from "@/lib/site/routes";

import { Capture, Checking, Guide, Retake } from "./_capture/steps";
import { EmailStep } from "./_email/step";
import { QuizStep } from "./_quiz/quiz";
import { AnalysisError, Analyzing, Blocked, NoResult, Reveal } from "./_reveal/steps";
import {
  CAMERA_START,
  initialState,
  type Question,
  QUESTIONS,
  reduce,
  stepProgress,
  toFormData,
} from "./flow-state";

/** The client gives up after this; the route's worst case is 26 s. */
const TIMEOUT_MS = 45_000;

/**
 * The whole analysis at one URL. Each new step pushes a history entry and the browser's Back
 * pops it; a reload starts again at the guide. Funnel events fire from the tap or the outcome,
 * never from a render.
 *
 * @see openspec/specs/capture-flow/spec.md
 * {@link openspec/specs/analytics/spec.md#requirement-the-flows-events-carry-only-their-outcome}
 */
export function Flow() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const { step } = state;
  const depth = state.trail.length;
  const shown = useRef(0);
  const checks = useRef(0);
  // The step as last rendered, so a check's result can tell whether the reducer will keep it.
  const shownStep = useRef(step);
  useEffect(() => {
    shownStep.current = step;
  }, [step]);
  const urls = useRef<string[]>([]);

  // One browser entry per trail entry, numbered from the entry the flow mounted on: after a
  // reload or a return from /privacy, the browser keeps earlier entries and their depths.
  // A popstate below our depth is Back, once per level. Entries below the mount's base belong to
  // an earlier visit, so Back onto one leaves the flow at once; Forward is undone.
  const base = useRef<number | null>(null);
  const depthOf = (e: { state: unknown }) => (e.state as { depth?: number } | null)?.depth ?? 0;
  useEffect(() => {
    base.current ??= depthOf(history);
    if (depth > shown.current) history.pushState({ depth: base.current + depth }, "");
    shown.current = depth;
  }, [depth]);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      // Another page's entry is the router's business.
      if (location.pathname !== "/analyze") return;
      const at = depthOf(e) - (base.current ?? 0);
      if (at < 0) {
        // With no page before the flow's first entry the browser stays put: the guide owns this
        // entry from now on.
        base.current = depthOf(e);
        for (; shown.current > 0; shown.current--) dispatch({ type: "back" });
        return history.go(-(depthOf(e) + 1));
      }
      if (at > shown.current) return history.go(shown.current - at);
      for (; shown.current > at; shown.current--) dispatch({ type: "back" });
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  // Each new screen starts at the top, with focus on its heading; with a mouse or trackpad, on its
  // `data-autofocus` field instead. The screen the flow opens on keeps focus where the page put
  // it, StrictMode's second run included (BL-41).
  // {@link openspec/specs/capture-flow/spec.md#requirement-a-new-step-moves-focus-to-its-heading-the-first-screen-does-not}
  const focused = useRef(step);
  // The capture step the flow opened on from the landing: it takes no focus, once.
  const opening = useRef<typeof step | null>(null);
  useEffect(() => {
    if (focused.current === step) return;
    focused.current = step;
    if (step === opening.current) return void (opening.current = null);
    scrollTo(0, 0);
    const main = document.querySelector("main");
    const fine = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    const target =
      (fine && main?.querySelector<HTMLElement>("[data-autofocus]")) ||
      main?.querySelector<HTMLElement>("h1");
    target?.focus({ preventScroll: true });
  }, [step]);

  // The landing's camera link: before the first paint, the camera replaces the guide and the
  // address drops `start`, so a reload opens the guide. StrictMode's second run finds no `start`.
  // The state is kept: on a fresh load this runs before Next patches history, and an entry without
  // Next's keys reloads the page on Back. Next's router keeps its own copy of the old address,
  // which nothing here reads.
  // {@link openspec/specs/capture-flow/spec.md#requirement-the-landings-camera-link-opens-the-flow-on-the-camera}
  useLayoutEffect(() => {
    if (new URLSearchParams(location.search).get("start") !== "camera") return;
    opening.current = CAMERA_START;
    dispatch({ type: "start-camera" });
    history.replaceState(history.state, "", "/analyze");
  }, []);

  // The models download while the guide is read. The photo's object URLs end with the page.
  useEffect(() => {
    loadVision().catch(() => {});
    const created = urls.current;
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const objectUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    return url;
  };

  const onPhoto = useCallback(
    async (photo: Blob | HTMLVideoElement, source: "camera" | "upload") => {
      // The frame is taken before "checking" unmounts the camera and stops its stream.
      const image = await (photo instanceof HTMLVideoElement
        ? createImageBitmap(photo).catch(() => null)
        : photo);
      const id = ++checks.current;
      dispatch({ type: "checking", id });
      try {
        if (!image) throw new Error("no camera frame");
        const checked = await checkImage(image);
        // Reported only when the reducer keeps it: the check on screen, not one overtaken by Back
        // and a newer photo, nor a second tap while checking.
        const now = shownStep.current;
        if (now.name === "checking" && now.id === id)
          track("photo_checked", photoCheckedProps({ ...checked, attempt: id, source }));
        const previewUrl = objectUrl(checked.preview);
        dispatch(
          checked.problem === null
            ? {
                type: "checked",
                id,
                problem: null,
                photo: {
                  traits: checked.traits,
                  crop: checked.crop,
                  cropUrl: objectUrl(checked.crop),
                  mask: checked.mask,
                },
                previewUrl,
              }
            : { type: "checked", id, problem: checked.problem, photo: null, previewUrl },
        );
      } catch (error) {
        // A photo the browser cannot decode, or models that failed to load.
        // ponytail: shown as the no-face retake; a screen of its own if Sentry shows load failures.
        Sentry.captureException(error);
        dispatch({ type: "checked", id, problem: "no-face", photo: null, previewUrl: null });
      } finally {
        if (image instanceof ImageBitmap) image.close();
      }
    },
    [],
  );

  // Sends once per attempt; leaving the analyzing step (Back) aborts it.
  const analyzing = step.name === "analyzing";
  const { request, attempt } = state;
  useEffect(() => {
    if (!analyzing || !request) return;
    // One controller for both Back and the timeout: AbortSignal.any is too new for iOS 16.
    const controller = new AbortController();
    let left = false;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    // Only the bot check answers 403; sending again cannot pass it.
    let blocked = false;
    fetch("/api/analyze", { method: "POST", body: toFormData(request), signal: controller.signal })
      .then(async (res) => {
        blocked = res.status === 403;
        if (!res.ok) throw new Error(`analyze: ${res.status}`);
        const response = (await res.json()) as AnalyzeResponse;
        if (response.kind === "result")
          track("analysis_result", {
            outcome: "result",
            photo_verdict: response.photo,
            text_source: response.text,
            season: response.season,
            agreement: response.agreement,
            confidence: response.confidence,
          });
        else if (response.kind === "rejected")
          track("analysis_result", {
            outcome: "rejected",
            photo_verdict: response.problem,
            problem: response.problem,
          });
        else track("quiz_no_result", { reason: response.reason, answers: request.answers });
        dispatch({ type: "analyzed", response });
      })
      .catch(() => {
        // Back (and StrictMode's aborted first run) left the step: nothing failed.
        if (left) return;
        track("analysis_failed", { quiz_only: !request.photo, blocked });
        dispatch({ type: "failed", blocked });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      left = true;
      controller.abort();
    };
  }, [analyzing, request, attempt]);

  const progress = stepProgress(step);
  const back = () => history.back();
  const retake = () => dispatch({ type: "retake" });

  return (
    <main className="flex flex-col gap-(--space-6)">
      {progress !== null && (
        <StepProgress
          current={progress}
          sub={step.name === "quiz" ? { index: step.question, count: QUESTIONS.length } : undefined}
        />
      )}
      {step.name === "guide" && (
        <Guide onCamera={() => dispatch({ type: "open-camera" })} onPhoto={onPhoto} />
      )}
      {step.name === "capture" && <Capture onPhoto={onPhoto} />}
      {step.name === "checking" && <Checking />}
      {step.name === "retake" && (
        <Retake
          problem={step.problem}
          previewUrl={step.previewUrl}
          offerQuizOnly={step.offerQuizOnly}
          onRetake={retake}
          onPhoto={onPhoto}
          onQuizOnly={() => dispatch({ type: "quiz-only" })}
        />
      )}
      {step.name === "quiz" && (
        <QuizStep
          question={step.question}
          answers={state.answers}
          onAnswer={(question, value) => dispatch({ type: "answer", question, value })}
          onNext={() => {
            // The reducer's own guard: the last question, answered.
            const last = step.question === QUESTIONS.length - 1;
            if (last && state.answers[QUESTIONS[step.question] as Question])
              track("quiz_completed", { quiz_only: state.quizOnly });
            dispatch({ type: "next" });
          }}
          onBack={back}
        />
      )}
      {step.name === "analyzing" && <Analyzing cropUrl={request?.photo?.cropUrl ?? null} />}
      {step.name === "reveal" && (
        <Reveal
          result={step.result}
          onRetake={retake}
          onReport={() => {
            if (step.result.reportId)
              track("report_requested", { quiz_only: step.result.agreement === "quiz-only" });
            dispatch({ type: "open-email" });
          }}
          onTryAgain={() => dispatch({ type: "try-again" })}
        />
      )}
      {step.name === "email" && step.result.reportId && (
        <EmailStep
          reportId={step.result.reportId}
          family={familyName(step.result.season)}
          quizOnly={step.result.agreement === "quiz-only"}
        />
      )}
      {step.name === "no-result" && (
        <NoResult onChange={() => dispatch({ type: "change-answers" })} onPhoto={retake} />
      )}
      {step.name === "error" &&
        (step.blocked ? (
          <Blocked />
        ) : (
          <AnalysisError onRetry={() => dispatch({ type: "try-again" })} />
        ))}
    </main>
  );
}
