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

describe("eval:fetch pacing", () => {
  const OTHER: EvalPhoto = {
    ...PHOTO,
    file: "p02/b.jpg",
    source: "https://upload.wikimedia.org/b.jpg",
  };
  const ok = () => new Response(BYTES);
  const tooMany = (headers?: HeadersInit) => new Response(null, { status: 429, headers });

  /** Records each requested pause and the order it came in, and never waits. */
  const pacing = () => {
    const log: string[] = [];
    const sleeps: number[] = [];
    const sleep = async (ms: number) => {
      log.push("sleep");
      sleeps.push(ms);
    };
    /** A fetch stub answering `answers` in turn (the last one repeats), logging each URL. */
    const answer = (first: () => Response, ...then: (() => Response)[]) => {
      let next = first;
      return vi.fn(async (url: string | URL | Request) => {
        log.push(String(url));
        const current = next;
        next = then.shift() ?? next;
        return current();
      });
    };
    return { log, sleeps, sleep, answer };
  };

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-two-photos-to-fetch} */
  it("pauses between two downloads, and not before the first", async () => {
    const { log, sleep, answer } = pacing();
    const fetch = answer(ok);
    await expect(fetchMissing(manifest(PHOTO, OTHER), dir, fetch, { sleep })).resolves.toEqual([
      "p01/a.jpg",
      "p02/b.jpg",
    ]);
    expect(log).toEqual([PHOTO.source, "sleep", OTHER.source]);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-the-source-rate-limits-the-fetch} */
  it("waits out a 429's Retry-After, retries, and writes the file", async () => {
    const { sleeps, sleep, answer } = pacing();
    const fetch = answer(() => tooMany({ "Retry-After": "2" }), ok);
    await expect(fetchMissing(manifest(PHOTO), dir, fetch, { sleep })).resolves.toEqual([
      "p01/a.jpg",
    ]);
    expect(sleeps).toEqual([2000]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(new Uint8Array(fs.readFileSync(path.join(dir, "p01/a.jpg")))).toEqual(BYTES);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-the-rate-limit-persists} */
  it("gives up on a 429 after its retries, naming the entry, and leaves no file", async () => {
    const { sleeps, sleep, answer } = pacing();
    const fetch = answer(() => tooMany());
    await expect(fetchMissing(manifest(PHOTO), dir, fetch, { sleep })).rejects.toThrow(
      /p01\/a\.jpg: HTTP 429/,
    );
    expect(fetch.mock.calls.length).toBeGreaterThan(1);
    expect(sleeps).toHaveLength(fetch.mock.calls.length - 1);
    expect(files().filter((f) => f.includes("."))).toEqual([]);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-the-rate-limit-outlasts-one-entry} */
  it("requests the next 429'd entry once after one has run out of retries", async () => {
    const { log, sleep, answer } = pacing();
    const fetch = answer(() => tooMany());
    const failure = fetchMissing(manifest(PHOTO, OTHER), dir, fetch, { sleep });
    await expect(failure).rejects.toThrow(/p01\/a\.jpg: HTTP 429/);
    await expect(failure).rejects.toThrow(/p02\/b\.jpg: HTTP 429/);
    expect(log.filter((entry) => entry === PHOTO.source).length).toBeGreaterThan(1);
    expect(log.filter((entry) => entry === OTHER.source)).toHaveLength(1);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-photo-that-is-gone-is-not-retried} */
  it("requests a 404 once and fails naming the entry", async () => {
    const { sleeps, sleep, answer } = pacing();
    const fetch = answer(() => new Response(null, { status: 404 }));
    await expect(fetchMissing(manifest(PHOTO), dir, fetch, { sleep })).rejects.toThrow(
      /p01\/a\.jpg: HTTP 404/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
  });
});
