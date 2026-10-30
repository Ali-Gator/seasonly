import { QUIZ_VALUES, QuizAnswersSchema, type QuizAnswers } from "@seasonly/analysis";

/**
 * The quiz page's step machine and its link to the photo, pure so they are unit-tested. A step is
 * a question's index or the result; the component keeps each one in a browser history entry.
 *
 * {@link openspec/specs/quiz-page/spec.md#requirement-each-quiz-page-step-is-a-browser-history-entry-that-keeps-the-answers}
 */
export type QuizPageStep = number | "result";

export interface QuizPageState {
  step: QuizPageStep;
  answers: QuizAnswers;
}

const QUESTIONS = Object.keys(QUIZ_VALUES) as (keyof QuizAnswers)[];

export const START: QuizPageState = { step: 0, answers: {} };

/** The next step, once the question on screen is answered. */
export function next(state: QuizPageState): QuizPageState {
  const { step, answers } = state;
  if (step === "result" || !answers[QUESTIONS[step] as keyof QuizAnswers]) return state;
  return { step: step + 1 < QUESTIONS.length ? step + 1 : "result", answers };
}

/** "Change my answers": question 1, every answer kept. */
export const change = ({ answers }: QuizPageState): QuizPageState => ({ step: 0, answers });

/** A valid quiz page entry from `history.state`, else null. A result needs all four answers. */
export function restore(historyState: unknown): QuizPageState | null {
  const entry = (historyState as { quizPage?: { step?: unknown; answers?: unknown } } | null)
    ?.quizPage;
  const answers = QuizAnswersSchema.safeParse(entry?.answers);
  if (!answers.success) return null;
  const step = entry?.step;
  if (step === "result") {
    return QUESTIONS.every((q) => answers.data[q]) ? { step, answers: answers.data } : null;
  }
  return Number.isInteger(step) && (step as number) >= 0 && (step as number) < QUESTIONS.length
    ? { step: step as number, answers: answers.data }
    : null;
}

/**
 * Back or Forward inside the page: the entry's step, with its answers under the newest ones. An
 * older entry may hold fewer; after a reload, the screen may. The entry the page opened on may
 * hold nothing: it is question 1.
 */
export function popped(state: QuizPageState, historyState: unknown): QuizPageState {
  const saved = restore(historyState);
  return { step: saved?.step ?? 0, answers: { ...saved?.answers, ...state.answers } };
}

/**
 * The selfie link: the four answers as given, `unsure` included.
 *
 * {@link openspec/specs/quiz-page/spec.md#requirement-the-photo-is-the-next-step-with-the-answers-kept}
 */
export function handoffHref(answers: QuizAnswers): string {
  const pairs = QUESTIONS.flatMap((q) => (answers[q] ? [[q, answers[q]]] : []));
  return `/analyze?${new URLSearchParams(pairs)}`;
}
