/**
 * @see openspec/specs/analysis-eval/spec.md
 */
import { expect, it } from "vitest";

import { tallyVerdicts } from "./vision.ts";

/** {@link openspec/specs/analysis-eval/spec.md#scenario-a-usable-photo-the-model-rejects} */
it("counts a usable photo the model calls several-faces among the usable verdicts", () => {
  const tally = tallyVerdicts([
    { file: "p01/a.jpg", expect: "pass", verdict: "several-faces" },
    { file: "p01/b.jpg", expect: "pass", verdict: "usable" },
    { file: "p02/a.jpg", expect: "several-faces", verdict: "several-faces" },
  ]);
  expect(tally).toEqual({
    sent: 3,
    usable: { "several-faces": 1, usable: 1 },
    severalFaces: { "several-faces": 1 },
  });
});
