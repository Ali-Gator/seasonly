/**
 * The paid vision run over the labeled eval set: one real call per photo that passes the
 * on-device check, with its face crop as the web app crops it, its photo-only season and the
 * daily slot stubbed. Writes counts and per-file verdicts to evals/vision-results.json, never the
 * model's text. Needs `pnpm eval:run` first, for the cached crops. Run only with
 * `pnpm eval:vision`, after the user approves the spend.
 *
 * {@link openspec/specs/analysis-eval/spec.md#requirement-the-paid-vision-run-happens-only-on-request}
 */
import fs from "node:fs";
import path from "node:path";

import { expect, it, vi } from "vitest";

import { PHOTOS_DIR, readManifest } from "../../../../../evals/fetch.ts";
import { mediapipeVersion } from "../../../../../evals/gate.ts";
import { cropPath, runPhotos } from "../../../../../evals/pipeline.ts";
import { formatJson } from "../../../../../evals/results.ts";
import { generateReportText, REPORT_TEXT_MODEL } from "./index";

// Show why a call fell back; Sentry is not initialized here.
vi.mock("@sentry/nextjs", () => ({
  captureException: (error: Error) => console.error(error.message, error.cause),
  flush: async () => true,
}));

const ROOT = path.resolve(import.meta.dirname, "../../../../..");
const CACHE_DIR = path.join(PHOTOS_DIR, ".cache");
const OUTPUT = path.join(ROOT, "evals/vision-results.json");

it(
  `${REPORT_TEXT_MODEL} on every photo that passes the device check`,
  { timeout: 60 * 60_000 },
  async () => {
    const manifest = readManifest();
    const { report } = await runPhotos(manifest.photos, {
      photosDir: PHOTOS_DIR,
      cacheDir: CACHE_DIR,
      version: mediapipeVersion(ROOT),
      extract: async (file) => {
        throw new Error(`${file}: not extracted yet; run pnpm eval:run first`);
      },
    });
    const sent = report.flatMap((r) =>
      r.problem === null && r.result ? [{ ...r, result: r.result }] : [],
    );

    const photos: { file: string; expect: string; verdict: string }[] = [];
    for (const r of sent) {
      const result = await generateReportText({
        faceCrop: new Uint8Array(fs.readFileSync(cropPath(CACHE_DIR, r.cacheKey))),
        result: r.result,
        answers: {},
        claimSlot: async () => "granted",
      });
      const verdict =
        result.kind === "personal"
          ? result.photo
          : result.kind === "rejected"
            ? result.problem
            : `static-${result.reason}`;
      photos.push({ file: r.file, expect: r.expect, verdict });
      console.log(`${r.file} (${r.expect}): ${verdict}`);
    }

    const tally = (expectations: string[]) =>
      photos
        .filter((p) => expectations.includes(p.expect))
        .reduce<Record<string, number>>(
          (t, p) => ({ ...t, [p.verdict]: (t[p.verdict] ?? 0) + 1 }),
          {},
        );
    fs.writeFileSync(
      OUTPUT,
      await formatJson({
        model: REPORT_TEXT_MODEL,
        sent: photos.length,
        usable: tally(["pass"]),
        severalFaces: tally(["several-faces"]),
        photos,
      }),
    );
    expect(photos).toHaveLength(sent.length);
  },
);
