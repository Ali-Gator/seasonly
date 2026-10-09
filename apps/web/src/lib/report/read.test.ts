import * as Sentry from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readReport, type ReportSelect } from "./read";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  createTransport: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const ROW = {
  season: "soft-autumn",
  agreement: "agree",
  text_source: "personal",
  summary: "Your warm hazel eyes.",
  agreement_note: "Gold jewelry points warm.",
  report_emails: [{ email: "maya.reyes@gmail.com", created_at: "2026-10-09T10:00:00Z" }],
  interest_clicks: { report_id: ID },
};

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("readReport", () => {
  /** {@link openspec/specs/report-page/spec.md#requirement-a-stored-report-renders-the-canvas-report} */
  it("gives the record, the latest address and the interest flag", async () => {
    const select: ReportSelect = vi.fn(async () => ({ data: ROW, error: null }));
    expect(await readReport(ID, { select })).toEqual({
      season: "soft-autumn",
      agreement: "agree",
      textSource: "personal",
      summary: "Your warm hazel eyes.",
      agreementNote: "Gold jewelry points warm.",
      email: "maya.reyes@gmail.com",
      interested: true,
    });
    expect(select).toHaveBeenCalledWith(ID, expect.any(AbortSignal));
  });

  it("gives no address and no interest when there are none", async () => {
    const select: ReportSelect = async () => ({
      data: { ...ROW, report_emails: [], interest_clicks: null },
      error: null,
    });
    expect(await readReport(ID, { select })).toMatchObject({ email: null, interested: false });
    const asList: ReportSelect = async () => ({
      data: { ...ROW, interest_clicks: [] },
      error: null,
    });
    expect(await readReport(ID, { select: asList })).toMatchObject({ interested: false });
  });

  /** {@link openspec/specs/report-page/spec.md#requirement-an-unknown-report-answers-404} */
  it("gives null for no row", async () => {
    expect(await readReport(ID, { select: async () => ({ data: null, error: null }) })).toBeNull();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-the-database-is-down} */
  it("reports an error to Sentry, then throws", async () => {
    await expect(
      readReport(ID, { select: async () => ({ data: null, error: { message: "down" } }) }),
    ).rejects.toThrow("report read failed");
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.flush).toHaveBeenCalled();
  });

  /** {@link openspec/specs/report-page/spec.md#requirement-a-failed-read-is-an-error-reported-to-sentry} */
  it("gives up after 3 s, reports and throws", async () => {
    vi.useFakeTimers();
    const pending = readReport(ID, { select: () => new Promise(() => {}) });
    const settled = expect(pending).rejects.toThrow("report read failed");
    await vi.advanceTimersByTimeAsync(3000);
    await settled;
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
