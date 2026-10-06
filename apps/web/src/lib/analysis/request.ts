import {
  type Agreement,
  type QuizAnswers,
  QuizAnswersSchema,
  type SeasonSlug,
  type Traits,
} from "@seasonly/analysis";
import { z } from "zod";

import type { PhotoVerdict } from "@/lib/report-text";

import type { TextSource } from "./store";

/**
 * The analyze route's multipart contract: `answers` (JSON, required), and `traits` (JSON) with
 * `crop` (a JPEG of at most 512 KB), both or neither.
 *
 * {@link openspec/specs/season-reveal/spec.md#requirement-the-analyze-route-refuses-malformed-input-before-spending-anything}
 */
export const MAX_CROP_BYTES = 512 * 1024;

const trait = z.number().min(-1).max(1);
const TraitsSchema = z.strictObject({ temperature: trait, value: trait, clarity: trait });

export interface AnalyzeRequest {
  answers: QuizAnswers;
  photo: { traits: Traits; crop: Uint8Array } | null;
}

export type AnalyzeResponse =
  | {
      kind: "result";
      reportId: string | null;
      season: SeasonSlug;
      agreement: Agreement;
      confidence: number;
      photo: PhotoVerdict | null;
      text: TextSource;
    }
  | { kind: "rejected"; problem: "no-face" | "several-faces" }
  | { kind: "no-result"; reason: "no-answers" | "answers-cancel" };

const json = (value: FormDataEntryValue | null): unknown => {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const isJpeg = (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

/** The validated request, or null for anything malformed. */
export async function parseAnalyzeRequest(request: Request): Promise<AnalyzeRequest | null> {
  const form = await request.formData().catch(() => null);
  if (!form) return null;
  const answers = QuizAnswersSchema.safeParse(json(form.get("answers")));
  if (!answers.success) return null;

  const rawTraits = form.get("traits");
  const crop = form.get("crop");
  if (rawTraits === null && crop === null) return { answers: answers.data, photo: null };

  const traits = TraitsSchema.safeParse(json(rawTraits));
  if (!traits.success || !(crop instanceof Blob)) return null;
  if (crop.type !== "image/jpeg" || crop.size > MAX_CROP_BYTES) return null;
  const bytes = new Uint8Array(await crop.arrayBuffer());
  if (!isJpeg(bytes)) return null;
  return { answers: answers.data, photo: { traits: traits.data, crop: bytes } };
}
