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
export interface CheckedPhoto {
  problem: RetakeReason | null;
  faceCount: number;
  measures: PhotoMeasures;
  /** The photo as checked, for the retake screen. */
  preview: Blob;
  /** Set only for a pass. */
  traits: Traits | null;
  crop: Blob | null;
  /** The crop's outline, a PNG whose alpha is the person; null without a pass or a segmenter. */
  mask: Blob | null;
}

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

/**
 * The crop's outline: black, with the person segmenter's confidence as alpha. Null when the
 * segmenter fails to load in time or to run; the pass stands either way.
 *
 * {@link openspec/specs/capture-flow/spec.md#scenario-no-person-segmenter}
 */
async function outline(crop: HTMLCanvasElement): Promise<Blob | null> {
  try {
    // ponytail: a fixed wait; the model usually loaded during the guide. Tune if Sentry shows misses.
    const segmenter = await Promise.race([
      loadPerson(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("person segmenter timed out")), PERSON_WAIT_MS),
      ),
    ]);
    const segmented = segmenter.segment(crop);
    const mask = segmented.confidenceMasks?.[0];
    // Copied: the mask's memory belongs to MediaPipe until close().
    const confidence =
      mask?.width === crop.width && mask.height === crop.height
        ? mask.getAsFloat32Array().slice()
        : null;
    segmented.close();
    if (!confidence) return null;
    const out = canvasOf(crop.width, crop.height);
    const image = out.context.createImageData(crop.width, crop.height);
    for (let i = 0; i < confidence.length; i++)
      image.data[i * 4 + 3] = Math.round((confidence[i] ?? 0) * 255);
    out.context.putImageData(image, 0, 0);
    return await encode(out.canvas, "image/png");
  } catch {
    return null;
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
  const outcome = { faceCount: faces.length, preview, traits: null, crop: null, mask: null };
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
  return {
    ...outcome,
    problem: null,
    measures: check.measures,
    traits: check.traits,
    crop: await jpeg(out.canvas),
    mask: await outline(out.canvas),
  };
}
