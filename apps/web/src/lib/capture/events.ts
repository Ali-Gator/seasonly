import type { PhotoMeasures } from "@seasonly/analysis";

import type { OutlineOutcome } from "./photo";

export { track } from "@/lib/analytics";

/**
 * The photo check's event. Never pixels, landmarks or the crop: only problems, counts and colors
 * as Lab numbers, and for a pass how its outline ended. A key without a value is left out.
 *
 * {@link openspec/specs/capture-flow/spec.md#requirement-each-photo-check-is-reported-without-photo-data}
 */
export function photoCheckedProps({
  problem,
  faceCount,
  measures,
  attempt,
  source,
  outline,
  outlineMs,
}: {
  problem: string | null;
  faceCount: number;
  measures: PhotoMeasures;
  attempt: number;
  source: "camera" | "upload";
  outline?: OutlineOutcome;
  outlineMs?: number;
}) {
  return {
    problem,
    face_count: faceCount,
    face_width: measures.faceWidth === null ? null : Math.round(measures.faceWidth),
    eye_white_lab: measures.eyeWhite,
    skin_lab: measures.skin,
    attempt,
    source,
    ...(outline && { outline }),
    ...(outlineMs !== undefined && { outline_ms: outlineMs }),
  };
}
