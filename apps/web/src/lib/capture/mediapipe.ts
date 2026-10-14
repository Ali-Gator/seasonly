import type { FaceLandmarker, ImageSegmenter } from "@mediapipe/tasks-vision";

import webPackage from "../../../package.json" with { type: "json" };

/**
 * MediaPipe's face landmarker and hair segmenter, and the person segmenter for the crop's outline,
 * loaded once per visit on the CPU delegate. The
 * wasm comes from jsDelivr at the exact installed version, pinned in package.json, so the code
 * and the wasm never drift; the models from Google's versioned paths.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
export const MEDIAPIPE_VERSION = webPackage.dependencies["@mediapipe/tasks-vision"];

export const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODELS = "https://storage.googleapis.com/mediapipe-models";
export const FACE_MODEL = `${MODELS}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`;
export const HAIR_MODEL = `${MODELS}/image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite`;
export const PERSON_MODEL = `${MODELS}/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite`;

export interface Vision {
  landmarker: FaceLandmarker;
  segmenter: ImageSegmenter;
}

let vision: Promise<Vision> | undefined;
let person: Promise<ImageSegmenter> | undefined;

/**
 * Starts loading on first call; a failed load is retried on the next. Also starts the person
 * segmenter, which can fail on its own without failing the check.
 */
export function loadVision(): Promise<Vision> {
  void loadPerson().catch(() => {});
  vision ??= (async () => {
    const { FaceLandmarker, FilesetResolver, ImageSegmenter } =
      await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    const [landmarker, segmenter] = await Promise.all([
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 2,
      }),
      ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAIR_MODEL, delegate: "CPU" },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      }),
    ]);
    return { landmarker, segmenter };
  })().catch((error: unknown) => {
    vision = undefined;
    throw error;
  });
  return vision;
}

/**
 * The person (selfie) segmenter: one confidence mask, person versus background, for the crop's
 * outline. Cached on its own; a failed load is retried on the next call.
 *
 * {@link openspec/specs/capture-flow/spec.md#requirement-only-a-face-crop-is-uploaded}
 */
export function loadPerson(): Promise<ImageSegmenter> {
  person ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    return ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: PERSON_MODEL, delegate: "CPU" },
      runningMode: "IMAGE",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  })().catch((error: unknown) => {
    person = undefined;
    throw error;
  });
  return person;
}
