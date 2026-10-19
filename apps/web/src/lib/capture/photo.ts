import { checkPhoto, type PhotoMeasures, type RetakeReason, type Traits } from "@seasonly/analysis";

import { cropBox, landmarkBox, pickFace } from "./faces";
import { loadPerson, loadVision } from "./mediapipe";

/**
 * The on-device check of one photo: decode and downscale, landmarks for up to two faces, the
 * hair mask, `checkPhoto`, then for a pass the traits from the full photo, the face crop and the
 * crop's outline. Browser only. Nothing here leaves the device.
 *
 * {@link openspec/specs/capture-flow/spec.md#requirement-every-photo-is-checked-on-the-device-before-anything-is-uploaded}
 */
export type CheckedPhoto = {
  faceCount: number;
  measures: PhotoMeasures;
  /** The photo as checked, for the retake screen. */
  preview: Blob;
} & (
  | {
      problem: null;
      traits: Traits;
      crop: Blob;
      /** The crop's outline, a PNG whose alpha is the person; null without a segmenter. */
      mask: Blob | null;
      /** How cutting the outline ended, and on `made` how long it took, for `photo_checked`. */
      outline: OutlineOutcome;
      outlineMs?: number;
    }
  | { problem: RetakeReason; traits?: never; crop?: never; mask?: never; outline?: never }
);

/**
 * `late`: no segmenter within the wait. `failed`: it failed to load or threw, or the encode
 * failed. `mismatch`: no mask, or one of another size. `missed`: too little of the middle is a
 * person.
 */
export type OutlineOutcome = "made" | "late" | "failed" | "mismatch" | "missed";

/** Longer side, in pixels, the photo is checked at. */
export const MAX_SIDE = 1280;

const NO_MEASURES: PhotoMeasures = { faceWidth: null, eyeWhite: null, skin: null };

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("no 2d canvas");
  return { canvas, context };
}

const encode = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality),
  );
const jpeg = (canvas: HTMLCanvasElement) => encode(canvas, "image/jpeg", 0.85);

/** How long a pass waits for the person segmenter before it goes on without an outline. */
const PERSON_WAIT_MS = 3000;
/** The least mean confidence over the crop's middle third, where the face is, for an outline. */
const MIN_FACE_CONFIDENCE = 0.5;

/** Mean confidence over the middle third of a `width` × `height` mask. */
function middleConfidence(confidence: Float32Array, width: number, height: number): number {
  let sum = 0;
  let count = 0;
  for (let y = Math.floor(height / 3); y < Math.ceil((2 * height) / 3); y++)
    for (let x = Math.floor(width / 3); x < Math.ceil((2 * width) / 3); x++, count++)
      sum += confidence[y * width + x] ?? 0;
  return count ? sum / count : 0;
}

/**
 * The crop's outline: black, with the person segmenter's confidence as alpha. No mask when the
 * segmenter fails to load in time or to run, or misses the face (the middle of a crop is the face
 * box), so an outline never empties the oval; the pass stands either way. `ms` is set on `made`.
 *
 * {@link openspec/specs/capture-flow/spec.md#scenario-no-person-segmenter}
 */
export async function outline(
  crop: HTMLCanvasElement,
): Promise<{ mask: Blob | null; outcome: OutlineOutcome; ms?: number }> {
  const start = performance.now();
  try {
    const segmenter = await Promise.race([
      loadPerson(),
      new Promise<null>((resolve) => setTimeout(resolve, PERSON_WAIT_MS, null)),
    ]);
    if (!segmenter) return { mask: null, outcome: "late" };
    const segmented = segmenter.segment(crop);
    const mask = segmented.confidenceMasks?.[0];
    // Copied: the mask's memory belongs to MediaPipe until close().
    const confidence =
      mask?.width === crop.width && mask.height === crop.height
        ? mask.getAsFloat32Array().slice()
        : null;
    segmented.close();
    if (!confidence) return { mask: null, outcome: "mismatch" };
    if (middleConfidence(confidence, crop.width, crop.height) < MIN_FACE_CONFIDENCE)
      return { mask: null, outcome: "missed" };
    const out = canvasOf(crop.width, crop.height);
    const image = out.context.createImageData(crop.width, crop.height);
    for (let i = 0; i < confidence.length; i++)
      image.data[i * 4 + 3] = Math.round((confidence[i] ?? 0) * 255);
    out.context.putImageData(image, 0, 0);
    const png = await encode(out.canvas, "image/png");
    return { mask: png, outcome: "made", ms: Math.round(performance.now() - start) };
  } catch {
    return { mask: null, outcome: "failed" };
  }
}

/** An uploaded file (EXIF orientation applied) or a frame taken from the camera. */
export async function checkImage(source: Blob | ImageBitmap): Promise<CheckedPhoto> {
  const [{ landmarker, segmenter }, bitmap] = await Promise.all([
    loadVision(),
    createImageBitmap(source),
  ]);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const { canvas, context } = canvasOf(width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const preview = await jpeg(canvas);

  const faces = landmarker.detect(canvas).faceLandmarks;
  const { severalFaces, landmarks } = pickFace(faces, width, height);
  const outcome = { faceCount: faces.length, preview };
  if (severalFaces) return { ...outcome, problem: "several-faces", measures: NO_MEASURES };

  const pixels = context.getImageData(0, 0, width, height).data;
  let hairMask: Uint8Array | undefined;
  if (landmarks) {
    const segmented = segmenter.segment(canvas);
    const mask = segmented.categoryMask;
    // Copied: the mask's memory belongs to MediaPipe until close(). 0 is background, 1 hair.
    if (mask?.width === width && mask.height === height) hairMask = mask.getAsUint8Array().slice();
    segmented.close();
  }
  const check = checkPhoto({ pixels, width, height, landmarks, hairMask });
  if (check.problem || !landmarks) {
    return { ...outcome, problem: check.problem ?? "no-face", measures: check.measures };
  }

  const box = cropBox(landmarkBox(landmarks, width, height), width, height);
  const out = canvasOf(box.outWidth, box.outHeight);
  out.context.drawImage(
    canvas,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    box.outWidth,
    box.outHeight,
  );
  const crop = await jpeg(out.canvas);
  const cut = await outline(out.canvas);
  return {
    ...outcome,
    problem: null,
    measures: check.measures,
    traits: check.traits,
    crop,
    mask: cut.mask,
    outline: cut.outcome,
    outlineMs: cut.ms,
  };
}
