/**
 * The face route with the crop store mocked.
 *
 * @see openspec/specs/draping-preview/spec.md
 */
import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readCrop } from "@/lib/draping/crops";

import { GET } from "./route";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  createTransport: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));
vi.mock("@/lib/draping/crops", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/draping/crops")>()),
  readCrop: vi.fn(),
}));

const ID = "AbCdEfGhIjKlMnOpQrSt_-";
const BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 8, 7]);

const get = (id: string) =>
  GET(new Request(`http://localhost/api/face/${encodeURIComponent(id)}`), {
    params: Promise.resolve({ id }),
  });

afterEach(() => vi.clearAllMocks());

describe("GET /api/face/[id]", () => {
  /** {@link openspec/specs/draping-preview/spec.md#scenario-a-stored-crop} */
  it("answers the stored crop as an uncacheable JPEG", async () => {
    vi.mocked(readCrop).mockResolvedValue(BYTES);
    const res = await get(ID);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
    expect(readCrop).toHaveBeenCalledWith(ID);
  });

  /** {@link openspec/specs/draping-preview/spec.md#scenario-a-malformed-id} */
  it.each(["short", "../reports"])(
    "answers 404 for the id %s without reaching the store",
    async (id) => {
      expect((await get(id)).status).toBe(404);
      expect(readCrop).not.toHaveBeenCalled();
    },
  );

  /** {@link openspec/specs/draping-preview/spec.md#scenario-no-crop} */
  it("answers 404 when no crop is stored", async () => {
    vi.mocked(readCrop).mockResolvedValue(null);
    expect((await get(ID)).status).toBe(404);
  });

  /** {@link openspec/specs/draping-preview/spec.md#requirement-the-face-route-serves-a-stored-crop-and-nothing-else} */
  it("reports a store error to Sentry and fails, which Next answers as 500", async () => {
    const error = new Error("storage down");
    vi.mocked(readCrop).mockRejectedValue(error);
    await expect(get(ID)).rejects.toBe(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});
