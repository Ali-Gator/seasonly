import type { PhotoMeasures } from "@seasonly/analysis";

export { track } from "@/lib/analytics";

/**
 * The photo check's event. Never pixels, landmarks or the crop: only problems, counts and colors
 * as Lab numbers.
 *
 * {@link openspec/specs/capture-flow/spec.md#requirement-each-photo-check-is-reported-without-photo-data}
 */
export function photoCheckedProps({
  problem,
  faceCount,
  measures,
  attempt,
  source,
}: {
  problem: string | null;
  faceCount: number;
  measures: PhotoMeasures;
  attempt: number;
  source: "camera" | "upload";
}) {
  return {
    problem,
    face_count: faceCount,
    face_width: measures.faceWidth === null ? null : Math.round(measures.faceWidth),
    eye_white_lab: measures.eyeWhite,
    skin_lab: measures.skin,
    attempt,
    source,
  };
}
