"use client";

import type { QuizAnswers } from "@seasonly/analysis";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { QuizStep } from "@/app/(flow)/analyze/_quiz/quiz";
import type { Question } from "@/app/(flow)/analyze/flow-state";
import { Button, Icon, SwatchGrid } from "@/components/ds";
import { track } from "@/lib/analytics";
import { quizResult } from "@/lib/mcp/result";
import {
  change,
  handoffHref,
  next,
  popped,
  type QuizPageState,
  restore,
  START,
} from "@/lib/quiz-page/state";

/**
 * The result or the no-result: the chat plugin's facts for the same answers, worked out here.
 *
 * {@link openspec/specs/quiz-page/spec.md#requirement-the-result-is-the-quiz-alone-season-family-worked-out-in-the-browser}
 * {@link openspec/specs/quiz-page/spec.md#requirement-answers-that-point-to-no-season-get-an-answer-not-a-guess}
 */
export function QuizResult({ answers, onChange }: { answers: QuizAnswers; onChange: () => void }) {
  const result = quizResult(answers).structured;
  const season = result.kind === "season";
  return (
    <section aria-labelledby="result-title" className="flex flex-col gap-(--space-4)">
      {season ? (
        <>
          <div className="flex flex-col gap-(--space-1)">
            <p className="overline">Your season family</p>
            <h2 className="h2" id="result-title" tabIndex={-1}>
              {result.family}
            </h2>
            <p className="lead">{result.tagline}</p>
          </div>
          <p className="text-(--ink-muted)">{result.revealLine}</p>
          <SwatchGrid
            colors={result.colors}
            columns={3}
            keepColumns
            label="6 of your colors"
            className="lg:grid-cols-6"
          />
          <p className="caption text-(--ink-muted)">{result.note}</p>
        </>
      ) : (
        <>
          <h2 className="h2" id="result-title" tabIndex={-1}>
            {result.title}
          </h2>
          <p className="text-(--ink-muted)">{result.message}</p>
        </>
      )}
      <div className="sn-stack">
        <Button href={handoffHref(answers)} block>
          <Icon name="camera" size={18} />
          {season ? "Add a selfie for your exact season" : "Let a selfie read your colors"}
        </Button>
        <Button variant="ghost" block onClick={onChange}>
          Change my answers
        </Button>
      </div>
    </section>
  );
}

/**
 * The quiz page's four questions and result. Each step is one browser history entry holding the
 * answers; the page's address never changes. Spreading `history.state` keeps Next's own keys.
 *
 * {@link openspec/specs/quiz-page/spec.md#requirement-each-quiz-page-step-is-a-browser-history-entry-that-keeps-the-answers}
 */
export function QuizPage() {
  const [state, setState] = useState(START);
  const root = useRef<HTMLDivElement>(null);
  // A step the person moved to, which takes focus; set before its state changes.
  const moved = useRef(false);
  const entry = (s: QuizPageState) => ({ ...history.state, quizPage: s });

  // A return from another page or a reload shows the step its entry holds, and takes no focus.
  useLayoutEffect(() => {
    const saved = restore(history.state);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the server has no history: it renders question 1
    if (saved) setState(saved);
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      // Another page's entry is the router's business.
      if (location.pathname !== "/color-analysis-quiz") return;
      moved.current = true;
      setState((s) => popped(s, e.state));
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  // {@link openspec/specs/capture-flow/spec.md#requirement-a-new-step-moves-focus-to-its-heading-the-first-screen-does-not}
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    root.current?.querySelector("h2")?.focus();
  }, [state.step]);

  const go = (to: QuizPageState) => {
    moved.current = true;
    history.pushState(entry(to), "");
    setState(to);
  };

  const onAnswer = (question: Question, value: string) => {
    const to = { ...state, answers: { ...state.answers, [question]: value } as QuizAnswers };
    history.replaceState(entry(to), "");
    setState(to);
  };

  const onNext = () => {
    const to = next(state);
    if (to === state) return;
    // {@link openspec/specs/analytics/spec.md#requirement-the-quiz-page-reports-its-result-without-the-answers}
    if (to.step === "result") {
      const result = quizResult(to.answers).structured;
      track("quiz_page_completed", {
        result: result.kind === "season" ? result.family.toLowerCase() : result.reason,
      });
    }
    go(to);
  };

  return (
    <div ref={root} className="flex flex-col gap-(--space-4)">
      {state.step === "result" ? (
        <QuizResult answers={state.answers} onChange={() => go(change(state))} />
      ) : (
        <>
          <p className="label">Question {state.step + 1} of 4</p>
          <QuizStep
            heading="h2"
            question={state.step}
            answers={state.answers}
            onAnswer={onAnswer}
            onNext={onNext}
            onBack={state.step > 0 ? () => history.back() : undefined}
          />
        </>
      )}
    </div>
  );
}
