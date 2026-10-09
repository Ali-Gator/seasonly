/**
 * @see openspec/specs/analysis-eval/spec.md
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchMissing } from "./fetch.ts";
import type { EvalPhoto, Manifest } from "./manifest.ts";

const BYTES = new Uint8Array([0xff, 0xd8, 1, 2, 3]);
const SHA = createHash("sha256").update(BYTES).digest("hex");
const PHOTO: EvalPhoto = {
  file: "p01/a.jpg",
  person: "p01",
  season: "soft-autumn",
  light: "daylight",
  source: "https://upload.wikimedia.org/a.jpg",
  sha256: SHA,
  license: "CC0",
};
const manifest = (...photos: EvalPhoto[]): Manifest => ({ version: 1, photos });

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(tmpdir(), "eval-fetch-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

/** A fetch stub serving `body` with `status` for every URL. */
const serve = (body: Uint8Array<ArrayBuffer>, status = 200) =>
  vi.fn(async () => new Response(body, { status }));

/** Every file under `dir`, relative. */
const files = () => fs.readdirSync(dir, { recursive: true, encoding: "utf8" }).sort();

describe("eval:fetch", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-missing-photo} */
  it("writes a missing file whose bytes hash right", async () => {
    const fetch = serve(BYTES);
    await expect(fetchMissing(manifest(PHOTO), dir, fetch)).resolves.toEqual(["p01/a.jpg"]);
    expect(new Uint8Array(fs.readFileSync(path.join(dir, "p01/a.jpg")))).toEqual(BYTES);
    expect(fetch).toHaveBeenCalledWith(PHOTO.source, expect.anything());
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-the-source-changed} */
  it("fails on a hash mismatch, naming the entry, and leaves no file", async () => {
    const fetch = serve(new Uint8Array([9, 9, 9]));
    await expect(fetchMissing(manifest(PHOTO), dir, fetch)).rejects.toThrow(
      /p01\/a\.jpg: sha256 [0-9a-f]{64}, expected/,
    );
    expect(files().filter((f) => f.includes("."))).toEqual([]);
  });

  it("fails on an HTTP error, naming the entry, and leaves no file", async () => {
    await expect(fetchMissing(manifest(PHOTO), dir, serve(BYTES, 404))).rejects.toThrow(
      /p01\/a\.jpg: HTTP 404/,
    );
    expect(files().filter((f) => f.includes("."))).toEqual([]);
  });

  it("fails on a missing file with no source", async () => {
    const { file, person, season, light } = PHOTO;
    await expect(
      fetchMissing(manifest({ file, person, season, light }), dir, serve(BYTES)),
    ).rejects.toThrow("p01/a.jpg: missing, and has no source");
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-nothing-to-fetch} */
  it("downloads nothing when every file is present", async () => {
    fs.mkdirSync(path.join(dir, "p01"));
    fs.writeFileSync(path.join(dir, "p01/a.jpg"), BYTES);
    const fetch = serve(BYTES);
    await expect(fetchMissing(manifest(PHOTO), dir, fetch)).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
