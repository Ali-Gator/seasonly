/**
 * The interest route with the store mocked.
 *
 * @see openspec/specs/interest-button/spec.md
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { recordInterest } from "@/lib/interest/record";

import { POST } from "./route";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  createTransport: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));
vi.mock("@/lib/interest/record", () => ({ recordInterest: vi.fn() }));

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const post = (id: string) =>
  POST(new Request(`http://localhost/api/reports/${id}/interest`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(recordInterest).mockResolvedValue({ kind: "recorded", email: "maya.reyes@gmail.com" });
});

describe("POST /api/reports/<id>/interest", () => {
  /** {@link openspec/specs/interest-button/spec.md#requirement-only-real-reports-take-interest} */
  it("answers a malformed id 404 with no database call", async () => {
    expect((await post("short")).status).toBe(404);
    expect(recordInterest).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-an-unknown-id} */
  it("answers an unknown report 404", async () => {
    vi.mocked(recordInterest).mockResolvedValue({ kind: "unknown" });
    expect((await post(ID)).status).toBe(404);
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-a-second-tap-from-another-device} */
  it("answers the first and a repeated tap 200 with the latest address", async () => {
    for (let i = 0; i < 2; i++) {
      const res = await post(ID);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, email: "maya.reyes@gmail.com" });
    }
    expect(recordInterest).toHaveBeenCalledWith(ID);
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-the-database-is-down} */
  it("answers a failed store 500", async () => {
    vi.mocked(recordInterest).mockResolvedValue({ kind: "failed" });
    expect((await post(ID)).status).toBe(500);
  });
});
