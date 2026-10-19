/**
 * The crop's outline: how each way out of `outline()` is named. MediaPipe is mocked; the canvas
 * is a stub, since the unit run has no 2D canvas.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadPerson } from "./mediapipe";
import { outline } from "./photo";

vi.mock("./mediapipe", () => ({ loadPerson: vi.fn(), loadVision: vi.fn() }));

/** A 3 × 3 crop: its middle third is the one centre pixel. */
const crop = { width: 3, height: 3 } as HTMLCanvasElement;

/** A segmenter whose one confidence mask holds `confidence`, `width` × `height`. */
const segmenterOf = (confidence: number[], width = 3, height = 3) =>
  ({
    segment: () => ({
      confidenceMasks: [{ width, height, getAsFloat32Array: () => Float32Array.from(confidence) }],
      close: vi.fn(),
    }),
  }) as unknown as Awaited<ReturnType<typeof loadPerson>>;

let png: Blob | null;

beforeEach(() => {
  png = new Blob(["png"], { type: "image/png" });
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: vi.fn(),
      }),
      toBlob: (done: (b: Blob | null) => void) => done(png),
    }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.mocked(loadPerson).mockReset();
});

describe("outline", () => {
  /** {@link openspec/specs/capture-flow/spec.md#scenario-a-passing-photo-whose-outline-is-made} */
  it("names a made mask and times it in whole milliseconds", async () => {
    vi.mocked(loadPerson).mockResolvedValue(segmenterOf(Array(9).fill(0.9)));
    const cut = await outline(crop);
    expect(cut.outcome).toBe("made");
    expect(cut.mask).toBe(png);
    expect(Number.isInteger(cut.ms)).toBe(true);
    expect(cut.ms).toBeGreaterThanOrEqual(0);
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-a-passing-photo-whose-outline-is-late} */
  it("names a segmenter that misses the 3 s wait late, with no time", async () => {
    vi.useFakeTimers();
    vi.mocked(loadPerson).mockReturnValue(new Promise(() => {}));
    const cut = outline(crop);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await cut).toStrictEqual({ mask: null, outcome: "late" });
  });

  /** {@link openspec/specs/capture-flow/spec.md#requirement-each-photo-check-is-reported-without-photo-data} */
  it("names a missing mask, or one of another size, a mismatch", async () => {
    vi.mocked(loadPerson).mockResolvedValue({
      segment: () => ({ confidenceMasks: undefined, close: vi.fn() }),
    } as unknown as Awaited<ReturnType<typeof loadPerson>>);
    expect(await outline(crop)).toStrictEqual({ mask: null, outcome: "mismatch" });
    vi.mocked(loadPerson).mockResolvedValue(segmenterOf(Array(16).fill(0.9), 4, 4));
    expect(await outline(crop)).toStrictEqual({ mask: null, outcome: "mismatch" });
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-no-person-segmenter} */
  it("names a mask whose middle third reads below 0.5 missed", async () => {
    vi.mocked(loadPerson).mockResolvedValue(segmenterOf([1, 1, 1, 1, 0.4, 1, 1, 1, 1]));
    expect(await outline(crop)).toStrictEqual({ mask: null, outcome: "missed" });
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-no-person-segmenter} */
  it("names a segmenter that fails to load or to run, or a failed encode, failed", async () => {
    vi.mocked(loadPerson).mockRejectedValue(new Error("load failed"));
    expect(await outline(crop)).toStrictEqual({ mask: null, outcome: "failed" });
    vi.mocked(loadPerson).mockResolvedValue({
      segment: () => {
        throw new Error("segment threw");
      },
    } as unknown as Awaited<ReturnType<typeof loadPerson>>);
    expect(await outline(crop)).toStrictEqual({ mask: null, outcome: "failed" });
    png = null;
    vi.mocked(loadPerson).mockResolvedValue(segmenterOf(Array(9).fill(0.9)));
    expect(await outline(crop)).toStrictEqual({ mask: null, outcome: "failed" });
  });
});
