/**
 * The four quiz questions from the approved canvas, validated where answers arrive from a client.
 *
 * @see openspec/specs/season-classifier/spec.md
 */
import { z } from "zod";

export const QUIZ_VALUES = {
  veins: ["green", "blue", "mix", "unsure"],
  jewelry: ["gold", "silver", "both", "unsure"],
  sun: ["burn", "burn-tan", "tan", "unsure"],
  hair: ["dark", "medium", "blonde", "red", "unsure"],
} as const;

/** Unknown questions and values are refused; a missing question counts as `unsure`. */
export const QuizAnswersSchema = z.strictObject({
  veins: z.enum(QUIZ_VALUES.veins).optional(),
  jewelry: z.enum(QUIZ_VALUES.jewelry).optional(),
  sun: z.enum(QUIZ_VALUES.sun).optional(),
  hair: z.enum(QUIZ_VALUES.hair).optional(),
});

export type QuizAnswers = z.infer<typeof QuizAnswersSchema>;
