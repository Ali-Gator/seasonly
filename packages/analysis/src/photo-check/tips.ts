/**
 * The retake tip for each photo problem, verbatim from the approved MVP canvas
 * (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3): the danger note's title and message, and
 * the retake-tip note's text and icon, on BadNoFace, BadDark, BadTint and BadFilter.
 * The shared heading and the Retake and Upload buttons belong to the screen, not to a problem.
 *
 * @see openspec/specs/photo-check/spec.md
 */
import type { PhotoProblem } from "./index.ts";

export interface RetakeTip {
  title: string;
  /** What is wrong. */
  message: string;
  /** How to retake. */
  tip: string;
  icon: "info" | "sun" | "camera";
}

export const RETAKE_TIPS: Record<PhotoProblem, RetakeTip> = {
  "no-face": {
    title: "No face found",
    message: "We couldn't find a face in this photo.",
    tip: "Hold the phone at eye level, with your whole face in the frame and your hair off your forehead.",
    icon: "info",
  },
  dark: {
    title: "Too dark",
    message: "This photo is too dark to read your skin tone.",
    tip: "Move closer to a window and face it. Turn off the lamps, so daylight does the work.",
    icon: "sun",
  },
  tint: {
    title: "Tinted light",
    message:
      "The light in this photo has a color cast, from a lamp or a colored wall. It shifts your skin tone, so your result would be off.",
    tip: "Stand by a window in daylight, away from lamps and colored walls. A cloudy day works best.",
    icon: "sun",
  },
  filter: {
    title: "Filter detected",
    message: "Your photo looks filtered. Filters shift skin tone, so your result would be off.",
    tip: "Try one straight from the camera. Turn off beauty mode and portrait effects first.",
    icon: "camera",
  },
};
