/**
 * The crop store with its storage calls injected, and the bucket migration loaded into PGlite on a
 * stub `storage.buckets` with Supabase's columns.
 *
 * @see openspec/specs/draping-preview/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import * as Sentry from "@sentry/nextjs";
import { StorageApiError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type CropUpload, readCrop, REPORT_ID, storeCrop } from "./crops";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

const ID = "AbCdEfGhIjKlMnOpQrSt_-";
const BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 8, 7]);

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("storeCrop", () => {
  /** {@link openspec/specs/draping-preview/spec.md#scenario-a-photo-result} */
  it("uploads <id>.jpg with exactly the crop's bytes", async () => {
    const upload = vi.fn<CropUpload>(async () => ({ error: null }));
    await storeCrop(ID, BYTES, { upload });
    expect(upload).toHaveBeenCalledWith(`${ID}.jpg`, BYTES);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/draping-preview/spec.md#scenario-the-store-is-down} */
  it("reports a failed upload to Sentry and does not throw", async () => {
    await expect(
      storeCrop(ID, BYTES, { upload: async () => ({ error: { message: "boom" } }) }),
    ).resolves.toBeUndefined();
    await expect(
      storeCrop(ID, BYTES, { upload: () => Promise.reject(new Error("down")) }),
    ).resolves.toBeUndefined();
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    expect(Sentry.flush).toHaveBeenCalled();
  });

  /** {@link openspec/specs/draping-preview/spec.md#scenario-the-store-hangs} */
  it("gives up after 3 s and reports a timeout to Sentry", async () => {
    vi.useFakeTimers();
    let settled = false;
    const pending = storeCrop(ID, BYTES, { upload: () => new Promise(() => {}) }).then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(2999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [error] = vi.mocked(Sentry.captureException).mock.calls[0] ?? [];
    expect(String((error as Error).cause)).toMatch(/timed out/);
  });
});

describe("readCrop", () => {
  const found = new Blob([BYTES], { type: "image/jpeg" });

  /** {@link openspec/specs/draping-preview/spec.md#scenario-a-stored-crop} */
  it("gives the stored bytes", async () => {
    const download = vi.fn(async () => ({ data: found, error: null }));
    expect(await readCrop(ID, { download })).toEqual(BYTES);
    expect(download).toHaveBeenCalledWith(`${ID}.jpg`);
  });

  /** {@link openspec/specs/draping-preview/spec.md#scenario-no-crop} */
  it("gives null when the store says not found, in either shape", async () => {
    for (const error of [
      new StorageApiError("Object not found", 400, "404"),
      new StorageApiError("Object not found", 404, "NoSuchKey"),
    ]) {
      expect(await readCrop(ID, { download: async () => ({ data: null, error }) })).toBeNull();
    }
  });

  /** {@link openspec/specs/draping-preview/spec.md#requirement-the-face-route-serves-a-stored-crop-and-nothing-else} */
  it("throws for any other error", async () => {
    for (const error of [
      new StorageApiError("Bucket not found", 400, "404"),
      new StorageApiError("Unauthorized", 400, "403"),
      new StorageApiError("Internal", 500, "500"),
      new Error("network"),
    ]) {
      await expect(readCrop(ID, { download: async () => ({ data: null, error }) })).rejects.toBe(
        error,
      );
    }
  });
});

describe("REPORT_ID", () => {
  /** {@link openspec/specs/draping-preview/spec.md#scenario-a-malformed-id} */
  it("matches 22 URL-safe base64 characters only", () => {
    expect(REPORT_ID.test(ID)).toBe(true);
    for (const bad of ["short", "../reports", `${ID}A`, "AbCdEfGhIjKlMnOpQrSt/.", ""]) {
      expect(REPORT_ID.test(bad)).toBe(false);
    }
  });
});

describe("crops bucket", () => {
  const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../../supabase/migrations");
  const migration = () => {
    const file = fs.readdirSync(MIGRATIONS).find((f) => f.endsWith("_crops_bucket.sql"));
    if (!file) throw new Error("no *_crops_bucket.sql migration");
    return fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
  };

  /** {@link openspec/specs/draping-preview/spec.md#scenario-the-buckets-settings} */
  it("is private, JPEG only, at most 512 KB, with no storage policy", async () => {
    const sql = migration();
    const db = new PGlite();
    await db.exec(`
      create schema storage;
      create table storage.buckets (
        id text primary key, name text not null, public boolean default false,
        file_size_limit bigint, allowed_mime_types text[]
      );
    `);
    await db.exec(sql);
    const { rows } = await db.query("select * from storage.buckets");
    expect(rows).toEqual([
      {
        id: "crops",
        name: "crops",
        public: false,
        file_size_limit: 524288,
        allowed_mime_types: ["image/jpeg"],
      },
    ]);
    expect(sql).not.toMatch(/create\s+policy/i);
    await db.close();
  });
});
