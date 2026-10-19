/**
 * The pure parts of the on-device check: the two-face rule, the crop box and the events.
 * MediaPipe and the canvas run only in a browser; E2E covers them.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
import { MIN_FACE_WIDTH } from "@seasonly/analysis";
import posthog from "posthog-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import webPackage from "../../../package.json";

import { photoCheckedProps, track } from "./events";
import { cropBox, landmarkBox, pickFace } from "./faces";
import { MEDIAPIPE_VERSION } from "./mediapipe";

vi.mock("posthog-js", () => ({ default: { __loaded: false, capture: vi.fn() } }));

afterEach(() => {
  vi.clearAllMocks();
  posthog.__loaded = false;
});

/** A face whose landmark box spans `width` × `width` px from (x, y), in a W × H image. */
const W = 1000;
const H = 1000;
const face = (x: number, y: number, width: number) =>
  [
    { x: x / W, y: y / H },
    { x: (x + width) / W, y: (y + width) / H },
    { x: (x + width / 2) / W, y: (y + width / 3) / H },
  ] as const;

describe("pickFace", () => {
  /** {@link openspec/specs/capture-flow/spec.md#scenario-two-people} */
  it("reports several faces when both are at least the minimum width", () => {
    expect(pickFace([face(0, 0, 200), face(500, 0, 200)], W, H)).toEqual({
      severalFaces: true,
      landmarks: null,
    });
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-a-small-face-in-the-background} */
  it("checks only the larger face when the other is narrower than the minimum", () => {
    const big = face(100, 100, 400);
    expect(pickFace([face(800, 0, 60), big], W, H)).toEqual({
      severalFaces: false,
      landmarks: big,
    });
    expect(pickFace([big], W, H)).toEqual({ severalFaces: false, landmarks: big });
    expect(pickFace([], W, H)).toEqual({ severalFaces: false, landmarks: null });
  });

  /** {@link openspec/specs/capture-flow/spec.md#requirement-two-measurable-faces-ask-for-a-retake} */
  it("uses the core's minimum face width as the threshold", () => {
    const big = face(0, 0, 400);
    expect(pickFace([big, face(600, 0, MIN_FACE_WIDTH)], W, H).severalFaces).toBe(true);
    expect(pickFace([big, face(600, 0, MIN_FACE_WIDTH - 1)], W, H).severalFaces).toBe(false);
  });
});

describe("cropBox", () => {
  /** {@link openspec/specs/capture-flow/spec.md#scenario-a-large-photo} */
  it("holds the whole face box, stays in the image and scales to at most 512 px", () => {
    const [w, h] = [3000, 4000];
    const lm = [
      { x: 900 / w, y: 1400 / h },
      { x: 2100 / w, y: 2900 / h },
    ];
    const faceBox = landmarkBox(lm, w, h);
    expect(faceBox).toEqual({ x: 900, y: 1400, width: 1200, height: 1500 });
    const box = cropBox(faceBox, w, h);
    expect(box.x).toBeLessThanOrEqual(900);
    expect(box.y).toBeLessThanOrEqual(1400);
    expect(box.x + box.width).toBeGreaterThanOrEqual(2100);
    expect(box.y + box.height).toBeGreaterThanOrEqual(2900);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(w);
    expect(box.y + box.height).toBeLessThanOrEqual(h);
    expect(Math.max(box.outWidth, box.outHeight)).toBe(512);
    expect(box.outWidth / box.outHeight).toBeCloseTo(box.width / box.height, 2);
  });

  /** {@link openspec/specs/capture-flow/spec.md#requirement-only-a-face-crop-is-uploaded} */
  it("clamps at the image edge and never scales a small crop up", () => {
    const box = cropBox({ x: 0, y: 10, width: 100, height: 120 }, 200, 300);
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
    expect(box.outWidth).toBe(box.width);
    expect(box.outHeight).toBe(box.height);
  });
});

describe("events", () => {
  /** {@link openspec/specs/capture-flow/spec.md#requirement-each-photo-check-is-reported-without-photo-data} */
  it("sends nothing while PostHog is off, and sends when it is on", () => {
    track("photo_checked", { problem: null });
    expect(posthog.capture).not.toHaveBeenCalled();
    posthog.__loaded = true;
    track("photo_checked", { problem: null });
    expect(posthog.capture).toHaveBeenCalledWith("photo_checked", { problem: null });
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-a-dark-photo} */
  it("reports a dark photo's measures and nothing of the image", () => {
    const eyeWhite = { L: 38, a: 1, b: 3 };
    const props = photoCheckedProps({
      problem: "dark",
      faceCount: 1,
      measures: { faceWidth: 412.5, eyeWhite, skin: { L: 40, a: 12, b: 18 } },
      attempt: 1,
      source: "upload",
    });
    expect(props).toEqual({
      problem: "dark",
      face_count: 1,
      face_width: 413,
      eye_white_lab: eyeWhite,
      skin_lab: { L: 40, a: 12, b: 18 },
      attempt: 1,
      source: "upload",
    });
    expect(Object.keys(props).join(" ")).not.toMatch(/pixel|landmark|image|crop|mask/);
  });

  const pass = {
    problem: null,
    faceCount: 1,
    measures: { faceWidth: 300, eyeWhite: { L: 80, a: 0, b: 2 }, skin: { L: 62, a: 14, b: 20 } },
    attempt: 1,
    source: "camera",
  } as const;

  /** {@link openspec/specs/capture-flow/spec.md#scenario-a-passing-photo-whose-outline-is-late} */
  it("reports a late outline with no outline time", () => {
    const props = photoCheckedProps({ ...pass, outline: "late" });
    expect(props.outline).toBe("late");
    expect(props).not.toHaveProperty("outline_ms");
    expect(Object.keys(props).join(" ")).not.toMatch(/pixel|landmark|image|crop|mask/);
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-a-passing-photo-whose-outline-is-made} */
  it("reports a made outline with its time in whole milliseconds", () => {
    const props = photoCheckedProps({ ...pass, outline: "made", outlineMs: 412 });
    expect(props.outline).toBe("made");
    expect(props.outline_ms).toBe(412);
    expect(Number.isInteger(props.outline_ms)).toBe(true);
    expect(Object.keys(props).join(" ")).not.toMatch(/pixel|landmark|image|crop|mask/);
  });

  /** {@link openspec/specs/capture-flow/spec.md#requirement-each-photo-check-is-reported-without-photo-data} */
  it("reports neither outline property for a rejected photo", () => {
    const props = photoCheckedProps({ ...pass, problem: "dark" });
    expect(props).not.toHaveProperty("outline");
    expect(props).not.toHaveProperty("outline_ms");
  });
});

describe("MediaPipe assets", () => {
  /** {@link openspec/specs/capture-flow/spec.md#requirement-every-photo-is-checked-on-the-device-before-anything-is-uploaded} */
  it("loads the wasm of the exact installed version", () => {
    expect(webPackage.dependencies["@mediapipe/tasks-vision"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(MEDIAPIPE_VERSION).toBe(webPackage.dependencies["@mediapipe/tasks-vision"]);
  });
});
