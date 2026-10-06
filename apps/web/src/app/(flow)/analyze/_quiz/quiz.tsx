"use client";

import type { QuizAnswers } from "@seasonly/analysis";

import { Button, QuizOption } from "@/components/ds";

import { type Question, QUESTIONS } from "../flow-state";

/**
 * The four questions of canvas artboards 06, in order. Each value is the core's quiz value.
 *
 * {@link openspec/specs/quiz/spec.md#requirement-four-questions-in-canvas-order}
 */
const QUIZ: Record<
  Question,
  { legend: string; options: { value: string; label: string; description?: string }[] }
> = {
  veins: {
    legend: "Look at the veins on your inner wrist in daylight. What color are they?",
    options: [
      { value: "green", label: "Green or olive", description: "Often a warm undertone" },
      { value: "blue", label: "Blue or purple", description: "Often a cool undertone" },
      { value: "mix", label: "A mix of both", description: "Often a neutral undertone" },
      { value: "unsure", label: "Hard to tell" },
    ],
  },
  jewelry: {
    legend: "Hold gold and silver jewelry against your skin. Which one looks more natural on you?",
    options: [
      { value: "gold", label: "Gold", description: "Skin looks even and warm" },
      { value: "silver", label: "Silver", description: "Skin looks clear and bright" },
      { value: "both", label: "Both look fine" },
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
    legend: "What's your natural hair color, without dye?",
    options: [
      { value: "dark", label: "Black or dark brown" },
      {
        value: "medium",
        label: "Medium or light brown",
        description: "Golden, ash or mousy brown",
      },
      { value: "blonde", label: "Blonde" },
      { value: "red", label: "Red or auburn" },
      { value: "unsure", label: "Hard to tell", description: "Gray, or dyed for years" },
    ],
  },
};

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
  return (
    <>
      <p className="overline">
        Question {question + 1} of {QUESTIONS.length}
      </p>
      <fieldset className="sn-quiz-group">
        <legend className="h3">
          <h1 className="contents" tabIndex={-1}>
            {legend}
          </h1>
        </legend>
        {options.map((o) => (
          <QuizOption
            key={o.value}
            name={name}
            value={o.value}
            label={o.label}
            description={o.description}
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
