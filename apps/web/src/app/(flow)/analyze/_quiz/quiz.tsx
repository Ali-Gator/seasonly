"use client";

import type { QuizAnswers } from "@seasonly/analysis";
import { type MouseEvent, useEffect, useRef } from "react";

import { Button, QuizOption } from "@/components/ds";
import { type Photo, QUIZ_PHOTOS } from "@/lib/site-content/images";

import { type Question, QUESTIONS } from "../flow-state";

/**
 * The four questions of canvas artboards 06, in order. Each value is the core's quiz value.
 *
 * {@link openspec/specs/quiz/spec.md#requirement-four-questions-in-canvas-order}
 */
const QUIZ: Record<
  Question,
  {
    legend: string;
    options: { value: string; label: string; description?: string; photo?: Photo }[];
  }
> = {
  veins: {
    legend: "Look at the veins on your inner wrist in daylight. What color are they?",
    options: [
      {
        value: "green",
        label: "Green or olive",
        description: "Often a warm undertone",
        photo: QUIZ_PHOTOS.veins.green,
      },
      {
        value: "blue",
        label: "Blue or purple",
        description: "Often a cool undertone",
        photo: QUIZ_PHOTOS.veins.blue,
      },
      {
        value: "mix",
        label: "A mix of both",
        description: "Often a neutral undertone",
        photo: QUIZ_PHOTOS.veins.mix,
      },
      { value: "unsure", label: "Hard to tell" },
    ],
  },
  jewelry: {
    legend: "Hold gold and silver jewelry against your skin. Which one looks more natural on you?",
    options: [
      {
        value: "gold",
        label: "Gold",
        description: "Skin looks even and warm",
        photo: QUIZ_PHOTOS.jewelry.gold,
      },
      {
        value: "silver",
        label: "Silver",
        description: "Skin looks clear and bright",
        photo: QUIZ_PHOTOS.jewelry.silver,
      },
      { value: "both", label: "Both look fine", photo: QUIZ_PHOTOS.jewelry.both },
      { value: "unsure", label: "Hard to tell" },
    ],
  },
  sun: {
    legend: "What does your skin do in the sun without sunscreen?",
    options: [
      { value: "burn", label: "Burns, rarely tans" },
      {
        value: "burn-tan",
        label: "Burns a little, then tans",
        description: "Goes golden after a day or two",
      },
      { value: "tan", label: "Tans easily, rarely burns" },
      { value: "unsure", label: "Hard to tell" },
    ],
  },
  hair: {
    legend: "What’s your natural hair color, without dye?",
    options: [
      { value: "dark", label: "Black or dark brown", photo: QUIZ_PHOTOS.hair.dark },
      {
        value: "medium",
        label: "Medium or light brown",
        description: "Golden, ash or mousy brown",
        photo: QUIZ_PHOTOS.hair.medium,
      },
      { value: "blonde", label: "Blonde", photo: QUIZ_PHOTOS.hair.blonde },
      { value: "red", label: "Red or auburn", photo: QUIZ_PHOTOS.hair.red },
      { value: "unsure", label: "Hard to tell", description: "Gray, or dyed for years" },
    ],
  },
};

/** How long a tapped choice shows before the next question. */
const ADVANCE_MS = 300;

/** {@link openspec/specs/quiz/spec.md#requirement-no-answer-is-chosen-for-the-person} */
export function QuizStep({
  question,
  answers,
  onAnswer,
  onNext,
  onBack,
}: {
  question: number;
  answers: QuizAnswers;
  onAnswer: (question: Question, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const name = QUESTIONS[question] as Question;
  const { legend, options } = QUIZ[name];
  const chosen = answers[name];
  const last = question === QUESTIONS.length - 1;

  // A tap moves on after a short pause that shows the choice (t18-design-review decision 7).
  // Keyboard choices fire clicks with no click count (Space) or none at all (arrow keys), so
  // they stay. The timer dies with the question, and the latest onNext runs.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const next = useRef(onNext);
  useEffect(() => {
    next.current = onNext;
  });
  useEffect(() => () => clearTimeout(timer.current), [question]);
  const onTap = (e: MouseEvent) => {
    if (last || e.detail === 0 || !(e.target as Element).closest(".sn-quiz")) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => next.current(), ADVANCE_MS);
  };

  return (
    <>
      {/* The click handler only times the move on; the radios inside stay the controls. */}
      <fieldset className="sn-quiz-group" onClick={onTap}>
        <legend className="h3">
          <h1 className="contents" tabIndex={-1}>
            {legend}
          </h1>
        </legend>
        {!last && (
          <p className="caption -mt-(--space-1) text-(--ink-muted)">Tap an answer to go on.</p>
        )}
        {options.map((o) => (
          <QuizOption
            key={o.value}
            name={name}
            value={o.value}
            label={o.label}
            description={o.description}
            image={o.photo?.src}
            imageAlt={o.photo?.alt}
            checked={chosen === o.value}
            onChange={() => onAnswer(name, o.value)}
          />
        ))}
      </fieldset>
      <div className="sn-stack">
        <Button block disabled={!chosen} onClick={onNext}>
          {last ? "See my result" : "Next"}
        </Button>
        <Button variant="ghost" block onClick={onBack}>
          Back
        </Button>
      </div>
    </>
  );
}
