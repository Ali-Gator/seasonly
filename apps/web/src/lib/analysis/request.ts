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
 * `crop` (a JPEG of at most 512 KB), both or neither, then `mask` (the crop's outline, a PNG of at
 * most 512 KB), only with a crop and optional.
 *
 * {@link openspec/specs/season-reveal/spec.md#requirement-the-analyze-route-refuses-malformed-input-before-spending-anything}
 */
export const MAX_CROP_BYTES = 512 * 1024;

const trait = z.number().min(-1).max(1);
const TraitsSchema = z.strictObject({ temperature: trait, value: trait, clarity: trait });

export interface AnalyzeRequest {
  answers: QuizAnswers;
  photo: { traits: Traits; crop: Uint8Array; mask?: Uint8Array } | null;
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
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const isPng = (bytes: Uint8Array) => PNG_SIGNATURE.every((b, i) => bytes[i] === b);

/** The image's bytes when it is a Blob of `type`, within the size cap and with the right signature. */
async function image(value: FormDataEntryValue | null, type: string, valid: typeof isJpeg) {
  if (!(value instanceof Blob) || value.type !== type || value.size > MAX_CROP_BYTES) return null;
  const bytes = new Uint8Array(await value.arrayBuffer());
  return valid(bytes) ? bytes : null;
}

/** The validated request, or null for anything malformed. */
export async function parseAnalyzeRequest(request: Request): Promise<AnalyzeRequest | null> {
  const form = await request.formData().catch(() => null);
  if (!form) return null;
  const answers = QuizAnswersSchema.safeParse(json(form.get("answers")));
  if (!answers.success) return null;

  const rawTraits = form.get("traits");
  const rawCrop = form.get("crop");
  const rawMask = form.get("mask");
  if (rawTraits === null && rawCrop === null)
    return rawMask === null ? { answers: answers.data, photo: null } : null;

  const traits = TraitsSchema.safeParse(json(rawTraits));
  if (!traits.success) return null;
  const crop = await image(rawCrop, "image/jpeg", isJpeg);
  if (!crop) return null;
  if (rawMask === null) return { answers: answers.data, photo: { traits: traits.data, crop } };
  const mask = await image(rawMask, "image/png", isPng);
  if (!mask) return null;
  return { answers: answers.data, photo: { traits: traits.data, crop, mask } };
}
