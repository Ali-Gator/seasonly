import type { FaceLandmarker, ImageSegmenter } from "@mediapipe/tasks-vision";

import webPackage from "../../../package.json";

/**
 * MediaPipe's face landmarker and hair segmenter, loaded once per visit on the CPU delegate. The
 * wasm comes from jsDelivr at the exact installed version, pinned in package.json, so the code
 * and the wasm never drift; the models from Google's versioned paths.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
export const MEDIAPIPE_VERSION = webPackage.dependencies["@mediapipe/tasks-vision"];

const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODELS = "https://storage.googleapis.com/mediapipe-models";
const FACE_MODEL = `${MODELS}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`;
const HAIR_MODEL = `${MODELS}/image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite`;

export interface Vision {
  landmarker: FaceLandmarker;
  segmenter: ImageSegmenter;
}

let vision: Promise<Vision> | undefined;

/** Starts loading on first call; a failed load is retried on the next. */
export function loadVision(): Promise<Vision> {
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
