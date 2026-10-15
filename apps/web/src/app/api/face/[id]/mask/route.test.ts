/**
 * The outline route with the crop store mocked.
 *
 * @see openspec/specs/draping-preview/spec.md
 */
import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readMask } from "@/lib/draping/crops";

import { GET } from "./route";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  createTransport: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));
vi.mock("@/lib/draping/crops", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/draping/crops")>()),
  readMask: vi.fn(),
}));

const ID = "AbCdEfGhIjKlMnOpQrSt_-";
const BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);

const get = (id: string) =>
  GET(new Request(`http://localhost/api/face/${encodeURIComponent(id)}/mask`), {
    params: Promise.resolve({ id }),
  });

afterEach(() => vi.clearAllMocks());

describe("GET /api/face/[id]/mask", () => {
  /** {@link openspec/specs/draping-preview/spec.md#scenario-a-stored-outline} */
  it("answers the stored outline as an uncacheable PNG", async () => {
    vi.mocked(readMask).mockResolvedValue(BYTES);
    const res = await get(ID);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
    expect(readMask).toHaveBeenCalledWith(ID);
  });

  /** {@link openspec/specs/draping-preview/spec.md#scenario-a-malformed-outline-id} */
  it.each(["short", "../reports"])(
    "answers 404 for the id %s without reaching the store",
    async (id) => {
      expect((await get(id)).status).toBe(404);
      expect(readMask).not.toHaveBeenCalled();
    },
  );

  /** {@link openspec/specs/draping-preview/spec.md#scenario-no-outline} */
  it("answers 404 when no outline is stored", async () => {
    vi.mocked(readMask).mockResolvedValue(null);
    expect((await get(ID)).status).toBe(404);
  });

  /** {@link openspec/specs/draping-preview/spec.md#requirement-the-outline-route-serves-a-stored-outline-and-nothing-else} */
  it("reports a store error to Sentry and fails, which Next answers as 500", async () => {
    const error = new Error("storage down");
    vi.mocked(readMask).mockRejectedValue(error);
    await expect(get(ID)).rejects.toBe(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});
