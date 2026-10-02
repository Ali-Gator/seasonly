/**
 * Sampling regions as rings of face-mesh landmark indices, and the pixels inside them.
 *
 * Lips and irises are the closed loops of FACEMESH_LIPS, FACEMESH_RIGHT_IRIS and
 * FACEMESH_LEFT_IRIS, chained from the edge sets in
 * https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py
 * (commit b453bf8). The lips are the outer contour minus the inner one.
 *
 * MediaPipe defines no cheek or forehead sets. These rings are chosen on the canonical face
 * model (canonical_face_model.obj, same commit): the cheeks are the hull of the landmarks
 * below each eye, clear of the nostrils and the lip line (u 0.14–0.36 and 0.64–0.86,
 * v 0.45–0.62 from the top); the forehead runs from the row at v 0.19 down to the brows,
 * below the hairline.
 *
 * "Right" is the person's right, which is on the image's left in an unmirrored photo.
 *
 * @see openspec/specs/color-sampling/spec.md
 */

export type Rings = readonly (readonly number[])[];

export const REGIONS = {
  forehead: [[69, 108, 151, 337, 299, 296, 336, 9, 107, 66]],
  rightCheek: [[116, 117, 119, 36, 206, 187, 147]],
  leftCheek: [[426, 266, 348, 346, 345, 376, 411]],
  lips: [
    [0, 37, 39, 40, 185, 61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267],
    [13, 82, 81, 80, 191, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312],
  ],
  rightIris: [[469, 470, 471, 472]],
  leftIris: [[474, 475, 476, 477]],
} as const satisfies Record<string, Rings>;

interface Point {
  x: number;
  y: number;
}

/**
 * Indices (row-major, ascending) of the pixels whose centers lie inside an odd number of the
 * rings. Landmarks are normalized; the scan covers the rings' bounding box clipped to the image.
 * Empty when a ring needs a landmark the list does not have.
 */
export function regionPixels(
  rings: Rings,
  landmarks: readonly Point[],
  width: number,
  height: number,
): number[] {
  if (rings.some((r) => r.some((i) => i >= landmarks.length))) return [];
  const poly = rings.map((r) =>
    r.map((i) => ({ x: (landmarks[i] as Point).x * width, y: (landmarks[i] as Point).y * height })),
  );
  const all = poly.flat();
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));
  const x0 = clamp(Math.floor(Math.min(...all.map((p) => p.x))), width);
  const x1 = clamp(Math.ceil(Math.max(...all.map((p) => p.x))), width);
  const y0 = clamp(Math.floor(Math.min(...all.map((p) => p.y))), height);
  const y1 = clamp(Math.ceil(Math.max(...all.map((p) => p.y))), height);

  const out: number[] = [];
  for (let y = y0; y < y1; y++) {
    const cy = y + 0.5;
    for (let x = x0; x < x1; x++) {
      const cx = x + 0.5;
      let odd = false;
      for (const ring of poly) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const a = ring[i] as Point;
          const b = ring[j] as Point;
          if (a.y > cy !== b.y > cy && cx < ((b.x - a.x) * (cy - a.y)) / (b.y - a.y) + a.x)
            odd = !odd;
        }
      }
      if (odd) out.push(y * width + x);
    }
  }
  return out;
}
