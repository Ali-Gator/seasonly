import { notFound } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readReport } from "@/lib/report/read";

import ReportPage, { dynamic } from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));
vi.mock("@/lib/report/read", () => ({ readReport: vi.fn() }));

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const page = (id: string) => ReportPage({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/r/<id>", () => {
  /** {@link openspec/specs/report-page/spec.md#scenario-a-malformed-id} */
  it("answers a malformed id 404 without reading the reports", async () => {
    await expect(page("short")).rejects.toThrow("404");
    expect(notFound).toHaveBeenCalled();
    expect(readReport).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/report-page/spec.md#requirement-an-unknown-report-answers-404} */
  it("answers an unknown id 404", async () => {
    vi.mocked(readReport).mockResolvedValue(null);
    await expect(page(ID)).rejects.toThrow("404");
    expect(readReport).toHaveBeenCalledWith(ID);
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-the-database-is-down} */
  it("lets a failed read throw to the error page", async () => {
    vi.mocked(readReport).mockRejectedValue(new Error("report read failed"));
    await expect(page(ID)).rejects.toThrow("report read failed");
    expect(notFound).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/report-page/spec.md#requirement-a-report-is-never-kept-by-a-shared-cache} */
  it("renders on every request", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
