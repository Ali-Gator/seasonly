/**
 * The retention job with the crop storage, the report delete and the clock injected. The fake
 * bucket lists like Storage: oldest first, at most one page.
 *
 * @see openspec/specs/data-retention/spec.md
 */
import { describe, expect, it, vi } from "vitest";

import {
  type CropEntry,
  deleteOldCrops,
  type DeleteTestReports,
  PAGE,
  type RemoveCrops,
  runRetention,
} from "./retention";

const NOW = new Date("2026-10-10T04:00:00Z");
const HOUR = 3_600_000;
const CUTOFF = new Date(NOW.getTime() - 24 * HOUR);

const crop = (name: string, hoursOld: number): CropEntry => ({
  name,
  id: `id-${name}`,
  created_at: new Date(NOW.getTime() - hoursOld * HOUR).toISOString(),
});

function bucket(entries: CropEntry[]) {
  let objects = [...entries];
  const list = vi.fn(async () => ({
    data: [...objects]
      .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
      .slice(0, PAGE),
    error: null,
  }));
  const remove = vi.fn<RemoveCrops>(async (names) => {
    const gone = objects.filter((o) => names.includes(o.name));
    objects = objects.filter((o) => !names.includes(o.name));
    return { data: gone, error: null };
  });
  return { list, remove, names: () => objects.map((o) => o.name).sort() };
}

describe("deleteOldCrops", () => {
  /**
   * {@link openspec/specs/data-retention/spec.md#scenario-an-old-crop}
   * {@link openspec/specs/data-retention/spec.md#scenario-a-young-crop}
   */
  it("removes a crop 25 h old and keeps one 23 h old", async () => {
    const b = bucket([crop("old.jpg", 25), crop("young.jpg", 23)]);
    expect(await deleteOldCrops(CUTOFF, b)).toBe(1);
    expect(b.names()).toEqual(["young.jpg"]);
  });

  /** {@link openspec/specs/data-retention/spec.md#scenario-more-old-crops-than-one-listing-holds} */
  it("removes 250 old crops among young ones across pages of 100", async () => {
    const old = Array.from({ length: 250 }, (_, i) => crop(`old-${i}.jpg`, 25 + i / 100));
    const young = Array.from({ length: 30 }, (_, i) => crop(`young-${i}.jpg`, i / 2));
    const b = bucket([...young, ...old]);
    expect(await deleteOldCrops(CUTOFF, b)).toBe(250);
    expect(b.names()).toEqual(young.map((c) => c.name).sort());
    expect(Math.max(...b.remove.mock.calls.map(([names]) => names.length))).toBeLessThanOrEqual(
      PAGE,
    );
  });

  /** {@link openspec/specs/data-retention/spec.md#scenario-after-a-missed-run} */
  it("removes a crop 47 h old, left by a missed run", async () => {
    const b = bucket([crop("missed.jpg", 47)]);
    expect(await deleteOldCrops(CUTOFF, b)).toBe(1);
    expect(b.names()).toEqual([]);
  });

  /** {@link openspec/specs/data-retention/spec.md#requirement-the-job-deletes-face-crops-older-than-24-hours} */
  it("skips listing entries without an id or a date, such as folder placeholders", async () => {
    const b = bucket([{ name: ".emptyFolderPlaceholder", id: null, created_at: null }]);
    expect(await deleteOldCrops(CUTOFF, b)).toBe(0);
    expect(b.remove).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/data-retention/spec.md#requirement-the-job-deletes-face-crops-older-than-24-hours} */
  it("throws instead of looping when a remove deletes fewer than asked", async () => {
    const b = bucket([crop("a.jpg", 30), crop("b.jpg", 30)]);
    const remove = vi.fn<RemoveCrops>(async () => ({ data: [], error: null }));
    await expect(deleteOldCrops(CUTOFF, { list: b.list, remove })).rejects.toThrow(
      /removed 0 of 2/,
    );
    expect(remove).toHaveBeenCalledTimes(1);
  });

  /** {@link openspec/specs/data-retention/spec.md#scenario-storage-fails} */
  it("throws a listing or remove error", async () => {
    const error = new Error("storage down");
    await expect(
      deleteOldCrops(CUTOFF, { list: async () => ({ data: null, error }), remove: vi.fn() }),
    ).rejects.toBe(error);
    const b = bucket([crop("a.jpg", 30)]);
    await expect(
      deleteOldCrops(CUTOFF, { list: b.list, remove: async () => ({ data: null, error }) }),
    ).rejects.toBe(error);
  });
});

describe("runRetention", () => {
  /** {@link openspec/specs/data-retention/spec.md#scenario-a-run} */
  it("deletes old crops, then old test reports, both against a 24 h cutoff", async () => {
    const b = bucket([crop("1.jpg", 25), crop("2.jpg", 30), crop("3.jpg", 47), crop("4.jpg", 1)]);
    const deleteTestReports = vi.fn<DeleteTestReports>(async () => ({ count: 1, error: null }));
    expect(await runRetention({ now: NOW, ...b, deleteTestReports })).toEqual({
      crops: 3,
      testReports: 1,
    });
    expect(deleteTestReports).toHaveBeenCalledWith(CUTOFF.toISOString());
    const [removedAt] = b.remove.mock.invocationCallOrder;
    const [reportsAt] = deleteTestReports.mock.invocationCallOrder;
    expect(removedAt).toBeLessThan(reportsAt ?? 0);
  });

  /** {@link openspec/specs/data-retention/spec.md#scenario-storage-fails} */
  it("stops before the reports when the crops fail", async () => {
    const deleteTestReports = vi.fn<DeleteTestReports>();
    await expect(
      runRetention({
        now: NOW,
        list: async () => ({ data: null, error: new Error("storage down") }),
        remove: vi.fn(),
        deleteTestReports,
      }),
    ).rejects.toThrow("storage down");
    expect(deleteTestReports).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/data-retention/spec.md#requirement-the-job-deletes-test-reports-older-than-24-hours} */
  it("throws a database error", async () => {
    const error = { message: "db down" };
    await expect(
      runRetention({
        now: NOW,
        ...bucket([]),
        deleteTestReports: async () => ({ count: null, error }),
      }),
    ).rejects.toBe(error);
  });
});
