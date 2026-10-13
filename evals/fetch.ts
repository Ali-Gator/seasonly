/**
 * `pnpm eval:fetch`: downloads every manifest photo missing under evals/photos/ from its source,
 * and keeps it only if its SHA-256 matches. Runs in plain Node, so it imports only the manifest.
 *
 * {@link openspec/specs/analysis-eval/spec.md#requirement-photos-are-fetched-verified-and-never-committed}
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { manifestProblems, type Manifest } from "./manifest.ts";

export const PHOTOS_DIR = path.join(import.meta.dirname, "photos");
export const MANIFEST_PATH = path.join(import.meta.dirname, "manifest.json");

// Wikimedia refuses generic scripted clients: https://meta.wikimedia.org/wiki/User-Agent_policy
const USER_AGENT = "SeasonlyEval/1.0 (https://seasonly.me; labeled photo set fetch) node-fetch";

/** A Commons original is a few MB; a stalled download fails instead of hanging the run. */
const FETCH_TIMEOUT_MS = 120_000;
/** Commons answers back-to-back downloads with 429s: a pause between them, and bounded retries. */
const FETCH_PAUSE_MS = 1_000;
const MAX_RETRIES = 4;
const MAX_RETRY_AFTER_MS = 60_000;
const BACKOFF_MS = 5_000;

/** The wait a 429's `Retry-After` asks for (seconds, or an HTTP date), or null without a usable one. */
function retryAfterMs(header: string | null): number | null {
  if (!header?.trim()) return null;
  if (/^\d+$/.test(header.trim())) return Number(header) * 1_000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/**
 * Fetches each missing file in turn, pausing between downloads, and returns the ones fetched. A 429
 * is retried after its `Retry-After` (capped) or a doubling backoff, until one entry runs out of
 * retries; later 429s then fail at once. Throws after trying them all, naming every entry that
 * failed; a failed entry leaves no file.
 */
export async function fetchMissing(
  manifest: Manifest,
  dir: string,
  fetchImpl: typeof fetch = fetch,
  { sleep = setTimeout }: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<string[]> {
  const fetched: string[] = [];
  const failed: string[] = [];
  let downloads = 0;
  let rateLimited = false;
  for (const photo of manifest.photos) {
    const target = path.join(dir, photo.file);
    if (fs.existsSync(target)) continue;
    if (!photo.source || !photo.sha256) {
      failed.push(`${photo.file}: missing, and has no source`);
      continue;
    }
    if (downloads++) await sleep(FETCH_PAUSE_MS);
    try {
      let response: Response;
      for (let attempt = 0; ; attempt++) {
        response = await fetchImpl(photo.source, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (response.status !== 429 || rateLimited) break;
        if (attempt === MAX_RETRIES) {
          rateLimited = true;
          break;
        }
        await response.body?.cancel();
        const wait = retryAfterMs(response.headers.get("Retry-After")) ?? BACKOFF_MS * 2 ** attempt;
        await sleep(Math.min(wait, MAX_RETRY_AFTER_MS));
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const hash = sha256(bytes);
      if (hash !== photo.sha256) throw new Error(`sha256 ${hash}, expected ${photo.sha256}`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const part = `${target}.${process.pid}.part`;
      fs.writeFileSync(part, bytes);
      fs.renameSync(part, target);
      fetched.push(photo.file);
    } catch (error) {
      failed.push(`${photo.file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failed.length) throw new Error(`eval:fetch failed:\n${failed.join("\n")}`);
  return fetched;
}

/** Reads and checks evals/manifest.json, or another manifest at `file`. */
export function readManifest(file = MANIFEST_PATH): Manifest {
  const manifest: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  const problems = manifestProblems(manifest);
  if (problems.length) throw new Error(`${file}:\n${problems.join("\n")}`);
  return manifest as Manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = readManifest();
  const fetched = await fetchMissing(manifest, PHOTOS_DIR);
  console.log(
    fetched.length
      ? `fetched ${fetched.length}:\n${fetched.join("\n")}`
      : `nothing missing (${manifest.photos.length} photos)`,
  );
}
