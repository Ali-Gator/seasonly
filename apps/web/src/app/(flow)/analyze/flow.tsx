"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { StepProgress } from "@/components/ds";
import type { AnalyzeResponse } from "@/lib/analysis/request";
import { photoCheckedProps, track } from "@/lib/capture/events";
import { loadVision } from "@/lib/capture/mediapipe";
import { checkImage } from "@/lib/capture/photo";

import { Capture, Checking, Consent, Guide, Retake } from "./_capture/steps";
import { QuizStep } from "./_quiz/quiz";
import { AnalysisError, Analyzing, NoResult, Reveal } from "./_reveal/steps";
import { initialState, reduce, stepProgress, toFormData } from "./flow-state";

/** The client gives up after this; the route's worst case is 26 s. */
const TIMEOUT_MS = 45_000;

/**
 * The whole analysis at one URL. Each new step pushes a history entry and the browser's Back
 * pops it; a reload starts again at the guide.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
export function Flow() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const { step } = state;
  const depth = state.trail.length;
  const shown = useRef(0);
  const checks = useRef(0);
  const urls = useRef<string[]>([]);

  // One browser entry per trail entry, numbered from the entry the flow mounted on: after a
  // reload or a return from /privacy, the browser keeps earlier entries and their depths.
  // A popstate below our depth is Back, once per level; one at or above it (Forward) is ignored.
  const base = useRef<number | null>(null);
  const depthOf = (e: { state: unknown }) => (e.state as { depth?: number } | null)?.depth ?? 0;
  useEffect(() => {
    base.current ??= depthOf(history);
    if (depth > shown.current) history.pushState({ depth: base.current + depth }, "");
    shown.current = depth;
  }, [depth]);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const to = Math.max(0, depthOf(e) - (base.current ?? 0));
      for (; shown.current > to; shown.current--) dispatch({ type: "back" });
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  // Each new screen starts at the top, with focus on its heading.
  useEffect(() => {
    scrollTo(0, 0);
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  }, [step]);

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
        track("photo_checked", photoCheckedProps({ ...checked, attempt: id, source }));
        dispatch({
          type: "checked",
          id,
          problem: checked.problem,
          photo:
            checked.traits && checked.crop
              ? {
                  traits: checked.traits,
                  crop: checked.crop,
                  cropUrl: objectUrl(checked.crop),
                }
              : null,
          previewUrl: objectUrl(checked.preview),
        });
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
    fetch("/api/analyze", { method: "POST", body: toFormData(request), signal: controller.signal })
      .then(async (res) => {
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
        if (!left) dispatch({ type: "failed" });
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
      {progress !== null && <StepProgress current={progress} />}
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
      {step.name === "consent" && state.photo && (
        <Consent
          cropUrl={state.photo.cropUrl}
          onAgree={() => dispatch({ type: "agree" })}
          onDecline={() => dispatch({ type: "decline" })}
        />
      )}
      {step.name === "quiz" && (
        <QuizStep
          question={step.question}
          answers={state.answers}
          onAnswer={(question, value) => dispatch({ type: "answer", question, value })}
          onNext={() => dispatch({ type: "next" })}
          onBack={back}
        />
      )}
      {step.name === "analyzing" && <Analyzing cropUrl={request?.photo?.cropUrl ?? null} />}
      {step.name === "reveal" && <Reveal result={step.result} onRetake={retake} />}
      {step.name === "no-result" && (
        <NoResult onChange={() => dispatch({ type: "change-answers" })} onPhoto={retake} />
      )}
      {step.name === "error" && <AnalysisError onRetry={() => dispatch({ type: "try-again" })} />}
    </main>
  );
}
