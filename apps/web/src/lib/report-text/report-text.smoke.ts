/**
 * The paid smoke run: three real vision calls on evals/photos/smoke.jpg (git-ignored; supply it),
 * with the daily slot stubbed. Run only with `pnpm test:smoke`, after the user approves the spend.
 * A person reads the printed text against the rules in
 * {@link openspec/specs/report-text/spec.md#requirement-the-personal-text-describes-coloring-only}.
 */
import fs from "node:fs";
import path from "node:path";

import type { SeasonResult } from "@seasonly/analysis";
import { expect, it, vi } from "vitest";

import { generateReportText, REPORT_TEXT_MODEL } from "./index";

// Show why a call fell back; Sentry is not initialized here.
vi.mock("@sentry/nextjs", () => ({
  captureException: (error: Error) => console.error(error.message, error.cause),
  flush: async () => true,
}));

const PHOTO = path.resolve(import.meta.dirname, "../../../../../evals/photos/smoke.jpg");
const OUTPUT = path.join(path.dirname(PHOTO), "smoke-output.json");
const RESULT: SeasonResult = {
  season: "soft-autumn",
  runnerUp: "true-autumn",
  confidence: 0.62,
  agreement: "agree",
  traits: { temperature: 0.4, value: -0.1, clarity: -0.5 },
};

it(`three calls to ${REPORT_TEXT_MODEL} give personal text`, async () => {
  const faceCrop = new Uint8Array(fs.readFileSync(PHOTO));
  const runs: { ms: number; result: unknown }[] = [];
  for (let i = 1; i <= 3; i++) {
    const start = performance.now();
    const result = await generateReportText({
      faceCrop,
      result: RESULT,
      answers: { veins: "green", jewelry: "gold", sun: "burn-tan", hair: "medium" },
      claimSlot: async () => "granted",
    });
    const ms = Math.round(performance.now() - start);
    console.log(`\n--- call ${i}: ${ms} ms ---\n${JSON.stringify(result, null, 2)}`);
    runs.push({ ms, result });
  }
  // Kept next to the photo (git-ignored), so the text survives whatever the reporter shows.
  fs.writeFileSync(OUTPUT, JSON.stringify(runs, null, 2));
  expect(runs.map((r) => (r.result as { kind: string }).kind)).toEqual([
    "personal",
    "personal",
    "personal",
  ]);
});
