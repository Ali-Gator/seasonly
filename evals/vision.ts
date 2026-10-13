/**
 * The tally of `pnpm eval:vision`: counts each verdict for the usable photos and for the photos
 * expected to show several faces. Pure, so the counting is unit-tested without a paid call.
 *
 * {@link openspec/specs/analysis-eval/spec.md#requirement-the-paid-vision-run-happens-only-on-request}
 */
export interface VisionVerdict {
  file: string;
  expect: string;
  verdict: string;
}

export function tallyVerdicts(photos: readonly VisionVerdict[]): {
  sent: number;
  usable: Record<string, number>;
  severalFaces: Record<string, number>;
} {
  const tally = (expectations: string[]) =>
    photos
      .filter((p) => expectations.includes(p.expect))
      .reduce<Record<string, number>>(
        (t, p) => ({ ...t, [p.verdict]: (t[p.verdict] ?? 0) + 1 }),
        {},
      );
  return { sent: photos.length, usable: tally(["pass"]), severalFaces: tally(["several-faces"]) };
}
