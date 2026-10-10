/**
 * The retention cron route with the job mocked.
 *
 * @see openspec/specs/data-retention/spec.md
 */
import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runRetention } from "@/lib/retention/retention";

import { GET } from "./route";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  createTransport: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn(async () => true),
}));
vi.mock("@/lib/retention/retention", () => ({ runRetention: vi.fn() }));

const SECRET = "s3cret-s3cret-s3cret-s3cret-s3cret";

const get = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/cron/retention", {
      headers: authorization ? { authorization } : {},
    }),
  );

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/cron/retention", () => {
  /** {@link openspec/specs/data-retention/spec.md#scenario-no-secret} */
  it("answers 401 without a header and runs nothing", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect((await get()).status).toBe(401);
    expect(runRetention).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/data-retention/spec.md#scenario-a-wrong-secret} */
  it.each(["Bearer wrong", `Bearer ${SECRET}x`, SECRET, `bearer ${SECRET}`])(
    "answers 401 for %s and runs nothing",
    async (header) => {
      vi.stubEnv("CRON_SECRET", SECRET);
      expect((await get(header)).status).toBe(401);
      expect(runRetention).not.toHaveBeenCalled();
    },
  );

  /** {@link openspec/specs/data-retention/spec.md#scenario-the-secret-is-not-configured} */
  it.each([undefined, ""])("answers 401 to Bearer undefined while CRON_SECRET is %j", async (v) => {
    vi.stubEnv("CRON_SECRET", v);
    expect((await get("Bearer undefined")).status).toBe(401);
    expect((await get("Bearer ")).status).toBe(401);
    expect(runRetention).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringMatching(/CRON_SECRET/),
      "error",
    );
  });

  /** {@link openspec/specs/data-retention/spec.md#scenario-a-run} */
  it("runs the job for the right secret and answers its counts", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.mocked(runRetention).mockResolvedValue({ crops: 3, testReports: 1 });
    const res = await get(`Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ crops: 3, testReports: 1 });
    expect(runRetention).toHaveBeenCalledTimes(1);
  });

  /** {@link openspec/specs/data-retention/spec.md#scenario-storage-fails} */
  it("reports a failed run to Sentry and fails, which Next answers as 500", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    const error = new Error("storage down");
    vi.mocked(runRetention).mockRejectedValue(error);
    await expect(get(`Bearer ${SECRET}`)).rejects.toBe(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});
