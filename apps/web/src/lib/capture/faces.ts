import { MIN_FACE_WIDTH } from "@seasonly/analysis";

/**
 * Face geometry for the on-device check: which face to check, and the crop that is uploaded.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
export type Landmarks = readonly { x: number; y: number }[];

/** Pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The landmarks' bounding box in pixels. */
export function landmarkBox(landmarks: Landmarks, width: number, height: number): Box {
  const xs = landmarks.map((p) => p.x * width);
  const ys = landmarks.map((p) => p.y * height);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/**
 * Largest face first. A second face at least the core's minimum width is `several-faces`;
 * a narrower one, such as a blurred person behind, is ignored.
 *
 * {@link openspec/specs/capture-flow/spec.md#requirement-two-measurable-faces-ask-for-a-retake}
 */
export function pickFace(
  faces: readonly Landmarks[],
  width: number,
  height: number,
): { severalFaces: boolean; landmarks: Landmarks | null } {
  const ranked = faces
    .map((landmarks) => ({ landmarks, w: landmarkBox(landmarks, width, height).width }))
    .sort((a, b) => b.w - a.w);
  if ((ranked[1]?.w ?? 0) >= MIN_FACE_WIDTH) return { severalFaces: true, landmarks: null };
  return { severalFaces: false, landmarks: ranked[0]?.landmarks ?? null };
}

const MARGIN = 0.3;
const MAX_SIDE = 512;

/**
 * The face box widened by 30 % on every side, clamped to the image, in whole pixels, and the
 * size it is drawn at: at most 512 px on its longer side, never scaled up.
 *
 * {@link openspec/specs/capture-flow/spec.md#requirement-only-a-face-crop-is-uploaded}
 */
export function cropBox(face: Box, width: number, height: number) {
  const x = Math.max(0, Math.floor(face.x - face.width * MARGIN));
  const y = Math.max(0, Math.floor(face.y - face.height * MARGIN));
  const right = Math.min(width, Math.ceil(face.x + face.width * (1 + MARGIN)));
  const bottom = Math.min(height, Math.ceil(face.y + face.height * (1 + MARGIN)));
  const box = { x, y, width: right - x, height: bottom - y };
  const scale = Math.min(1, MAX_SIDE / Math.max(box.width, box.height));
  return {
    ...box,
    outWidth: Math.round(box.width * scale),
    outHeight: Math.round(box.height * scale),
  };
}
