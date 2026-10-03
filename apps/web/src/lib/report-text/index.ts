import { type QuizAnswers, SEASON_COPY, type SeasonResult, seasonFamily } from "@seasonly/analysis";
import * as Sentry from "@sentry/nextjs";
import {
  generateText,
  type LanguageModel,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
} from "ai";
import { z } from "zod";

import { claimAnalysisSlot, type SlotClaim } from "../abuse/daily-cap";
import { seasonName } from "../site/routes";

/**
 * The one vision call per analysis: a personal summary, a personal agreement note and a check of
 * the photo. Every way to fall back is a returned value, so the caller maps each to an event.
 *
 * @see openspec/specs/report-text/spec.md
 */

/** A vision and structured-output model on the AI Gateway, checked against its list 2026-10-03. */
export const REPORT_TEXT_MODEL = "google/gemini-3.8-flash";

const TIMEOUT_MS = 20_000;

export const PHOTO_VERDICTS = ["ok", "no-face", "several-faces", "filter", "heavy-makeup"] as const;
export type PhotoVerdict = (typeof PHOTO_VERDICTS)[number];
export type FallbackReason = "capped" | "cap-unavailable" | "failed" | "timeout" | "invalid";

export type ReportTextResult =
  | {
      kind: "personal";
      summary: string;
      agreementNote: string;
      photo: "ok" | "filter" | "heavy-makeup";
    }
  | { kind: "static"; reason: FallbackReason }
  | { kind: "rejected"; problem: "no-face" | "several-faces" };

/**
 * Looser than the fixed copy's 600 and 240: a model that runs a little long is still used.
 * No season field: the classifier owns the season.
 *
 * {@link openspec/specs/report-text/spec.md#requirement-personal-text-is-schema-valid-or-unused}
 */
export const PersonalTextSchema = z.strictObject({
  photo: z.enum(PHOTO_VERDICTS),
  summary: z.string().min(1).max(700),
  agreementNote: z.string().min(1).max(300),
});

const ANSWER_WORDS: { [Q in keyof QuizAnswers]-?: Partial<Record<string, string>> } = {
  veins: {
    green: "the veins on the wrist look green",
    blue: "the veins on the wrist look blue",
    mix: "the veins look both green and blue",
  },
  jewelry: {
    gold: "gold jewelry suits them better",
    silver: "silver jewelry suits them better",
    both: "gold and silver suit them equally",
  },
  sun: { burn: "burns in the sun", "burn-tan": "burns, then tans", tan: "tans easily" },
  hair: {
    dark: "natural hair is dark",
    medium: "natural hair is medium brown",
    blonde: "natural hair is blonde",
    red: "natural hair is red",
  },
};

const AGREEMENT_WORDS: Record<SeasonResult["agreement"], string> = {
  agree: "the photo and the quiz answers point the same way",
  differ: "the photo and the quiz answers point opposite ways on warmth; the photo counts for more",
  "photo-only": "there are no quiz answers; the result comes from the photo alone",
  "quiz-only": "there is no photo; the result comes from the quiz answers alone",
};

const fixed = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);

/**
 * The rules follow {@link openspec/specs/report-text/spec.md#requirement-the-personal-text-describes-coloring-only}
 * and {@link openspec/specs/report-text/spec.md#requirement-the-classifier-owns-the-season}.
 */
export function buildPrompt(result: SeasonResult, answers: QuizAnswers) {
  const season = seasonName(result.season);
  const system = `You write two short passages for a personal color analysis report, and you check the photo they describe.

The season is already decided: ${season}. Do not question it, suggest another season or mention confidence.

Rules:
- Write in the second person ("your skin", "your eyes").
- Describe only the visible coloring of the skin, hair and eyes, and how it fits ${season}.
- Never mention ethnicity, race, age, body, health or attractiveness.
- summary: 2 to 4 sentences, under 600 characters, in the voice and length of the reference summary. Describe this person's coloring; do not copy the reference.
- agreementNote: 1 or 2 sentences, under 240 characters. Name at least one quiz answer and what it pointed to, and at least one feature the photo showed and what it pointed to. For example: "Green veins and gold jewelry point warm. Your soft brown hair and hazel eyes point muted." If there are no quiz answers, say what the photo showed.
- photo: your verdict on the image.
  - "no-face": no human face is visible.
  - "several-faces": more than one face is visible.
  - "filter": a beauty or color filter, or heavy editing, has shifted the skin tone.
  - "heavy-makeup": makeup hides the natural skin tone, such as a foundation in another shade or heavy contour.
  - "ok": none of the above.
  Still write a short summary and agreementNote when the verdict is "no-face" or "several-faces".`;

  const words = (Object.keys(ANSWER_WORDS) as (keyof QuizAnswers)[])
    .map((q) => ANSWER_WORDS[q][answers[q] ?? ""])
    .filter(Boolean);
  const { temperature, value, clarity } = result.traits;
  const text = `Season: ${season} (${seasonFamily(result.season)} family). Runner-up: ${seasonName(result.runnerUp)}.
Photo and quiz: ${AGREEMENT_WORDS[result.agreement]}.
Measured traits, each from -1 to +1:
- temperature ${fixed(temperature)} (-1 cool, +1 warm)
- value ${fixed(value)} (-1 deep, +1 light)
- clarity ${fixed(clarity)} (-1 soft, +1 clear)
Quiz answers: ${words.length ? words.join("; ") : "none"}.
Reference summary for ${season}, for voice and length only: "${SEASON_COPY[result.season].summary}"
The attached image is the person's face crop.`;
  return { system, text };
}

async function fallback(reason: FallbackReason, cause?: unknown): Promise<ReportTextResult> {
  // Reaching the cap is expected. Every other fallback is a fault someone must see, and it
  // returns normally, so nothing else flushes before the function freezes.
  if (reason !== "capped") {
    Sentry.captureException(new Error(`report-text fallback: ${reason}`, { cause }));
    await Sentry.flush(2000);
  }
  return { kind: "static", reason };
}

/** {@link openspec/specs/report-text/spec.md#requirement-one-vision-call-per-analysis} */
export async function generateReportText({
  faceCrop,
  result,
  answers,
  claimSlot = claimAnalysisSlot,
  model = REPORT_TEXT_MODEL,
}: {
  /** JPEG. */
  faceCrop: Uint8Array;
  result: SeasonResult;
  answers: QuizAnswers;
  /** Test seams; production uses the defaults. */
  claimSlot?: () => Promise<SlotClaim>;
  model?: LanguageModel;
}): Promise<ReportTextResult> {
  const slot = await claimSlot();
  if (slot === "capped") return fallback("capped");
  if (slot === "unavailable") return fallback("cap-unavailable");

  const { system, text } = buildPrompt(result, answers);
  const controller = new AbortController();
  // A timer rather than AbortSignal.timeout, so fake timers drive the test.
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let output: z.infer<typeof PersonalTextSchema>;
  try {
    const response = await generateText({
      model,
      output: Output.object({ schema: PersonalTextSchema }),
      // The SDK's default retries would make a second paid call.
      maxRetries: 0,
      abortSignal: controller.signal,
      system,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text },
            { type: "image", image: faceCrop, mediaType: "image/jpeg" },
          ],
        },
      ],
    });
    output = response.output;
  } catch (error) {
    if (controller.signal.aborted) return fallback("timeout", error);
    if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error))
      return fallback("invalid", error);
    return fallback("failed", error);
  } finally {
    clearTimeout(timer);
  }

  if (output.photo === "no-face" || output.photo === "several-faces")
    return { kind: "rejected", problem: output.photo };
  return {
    kind: "personal",
    summary: output.summary,
    agreementNote: output.agreementNote,
    photo: output.photo,
  };
}
