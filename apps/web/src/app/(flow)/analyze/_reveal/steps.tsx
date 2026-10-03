"use client";

import { AGREEMENT_COPY, SEASON_COPY, seasonFamily } from "@seasonly/analysis";
import { useEffect, useState } from "react";

import { Button, Icon, Note } from "@/components/ds";

import type { Result } from "../flow-state";

/**
 * Analyzing, reveal, no-result and error: canvas artboards 07, 08 and 08b to 08d.
 *
 * @see openspec/specs/season-reveal/spec.md
 */
const ESTIMATE_S = 20;

/** {@link openspec/specs/season-reveal/spec.md#requirement-the-analyzing-step-follows-the-canvas-and-fails-visibly} */
export function Analyzing({ cropUrl }: { cropUrl: string | null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  // Eases toward 90 % over about 20 s; the response replaces this screen.
  const percent = Math.round(90 * (1 - Math.exp(-elapsed / 7)));
  const left = ESTIMATE_S - elapsed;
  const lines: [string, "done" | "current" | "next"][] = [
    ["Checked the light in your photo", "done"],
    ["Found your skin, eye and hair colors", "done"],
    ["Weighing your quiz answers", elapsed < ESTIMATE_S / 2 ? "current" : "done"],
    ["Matching you to a season", elapsed < ESTIMATE_S / 2 ? "next" : "current"],
  ];
  return (
    <>
      {cropUrl && (
        <div className="sn-slot h-44 w-33 self-center rounded-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
          <img src={cropUrl} alt="Your face crop" />
        </div>
      )}
      <div className="flex flex-col gap-(--space-3) text-center">
        <h1 className="h1" tabIndex={-1}>
          Reading your colors
        </h1>
        <p className="lead text-(--ink-muted)">This takes under 30 seconds.</p>
      </div>
      <div className="flex flex-col gap-(--space-2)">
        <div
          role="progressbar"
          aria-label="Analysis progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1 overflow-hidden rounded-(--radius-pill) bg-(--line)"
        >
          <div className="h-full bg-(--ink) transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        <p className="caption flex justify-between text-(--ink-muted)">
          <span>{left > 0 ? `About ${left} seconds left` : "Almost done"}</span>
          <span>{percent}%</span>
        </p>
      </div>
      <ol className="flex flex-col gap-(--space-3)">
        {lines.map(([text, state]) => (
          <li
            key={text}
            aria-current={state === "current" ? "step" : undefined}
            className={`flex items-center gap-(--space-2) ${state === "current" ? "label" : ""} ${state === "next" ? "text-(--ink-muted)" : "text-(--ink)"}`}
          >
            <Icon
              name={state === "done" ? "check" : state === "current" ? "clock" : "info"}
              size={18}
            />
            <span>{text}</span>
          </li>
        ))}
      </ol>
      {cropUrl && (
        <Button block aria-disabled="true">
          Analyzing your photo
        </Button>
      )}
    </>
  );
}

const capitalize = (s: string) => s[0]?.toUpperCase() + s.slice(1);

/** {@link openspec/specs/season-reveal/spec.md#requirement-the-reveal-shows-the-season-family} */
export function Reveal({ result, onRetake }: { result: Result; onRetake: () => void }) {
  const family = capitalize(seasonFamily(result.season));
  const copy = SEASON_COPY[result.season];
  const quizOnly = result.agreement === "quiz-only";
  return (
    <div className="flex min-h-[70svh] flex-col gap-(--space-8)">
      <div className="flex flex-col gap-(--space-3) pt-(--space-16) text-center">
        <p className="overline">Your season family</p>
        <h1 className="display" tabIndex={-1}>
          {family}
        </h1>
        <p className="quote text-(--ink-muted)">{copy.tagline}</p>
      </div>
      <p className="lead text-center">{copy.revealLine}</p>
      {quizOnly && (
        <Note title={AGREEMENT_COPY["quiz-only"].title}>{AGREEMENT_COPY["quiz-only"].body}</Note>
      )}
      <Note title="One more step to your subtype">
        {family} has three subtypes. Your full report names yours and gives you 30 colors.
      </Note>
      <div className="sn-stack mt-auto">
        <Button variant="ghost" block onClick={onRetake}>
          {quizOnly && <Icon name="camera" size={18} />}
          {quizOnly ? "Add a photo" : "Retake my photo"}
        </Button>
      </div>
    </div>
  );
}

/** {@link openspec/specs/season-reveal/spec.md#requirement-quiz-answers-with-nothing-to-classify-show-a-no-result-screen} */
export function NoResult({ onChange, onPhoto }: { onChange: () => void; onPhoto: () => void }) {
  return (
    <>
      <div className="flex flex-col gap-(--space-3) pt-(--space-8)">
        <h1 className="h1" tabIndex={-1}>
          We need a bit more
        </h1>
        <p className="lead text-(--ink-muted)">
          Your answers don&apos;t point to one season yet. Change a few, or add a photo and
          we&apos;ll read your colors from it.
        </p>
      </div>
      <div className="sn-stack">
        <Button block onClick={onChange}>
          Change my answers
        </Button>
        <Button variant="ghost" block onClick={onPhoto}>
          <Icon name="camera" size={18} />
          Add a photo
        </Button>
      </div>
    </>
  );
}

export function AnalysisError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <div className="flex flex-col gap-(--space-3) pt-(--space-8)">
        <h1 className="h1" tabIndex={-1}>
          Something went wrong
        </h1>
        <p className="lead text-(--ink-muted)">
          We couldn&apos;t finish reading your colors. Nothing is lost, so you can try again.
        </p>
      </div>
      <div className="sn-stack">
        <Button block onClick={onRetry}>
          Try again
        </Button>
      </div>
    </>
  );
}
