/**
 * @see openspec/specs/report-text/spec.md
 */
import type { QuizAnswers, SeasonResult } from "@seasonly/analysis";
import * as Sentry from "@sentry/nextjs";
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SlotClaim } from "../abuse/daily-cap";

import { generateReportText, type FallbackReason } from "./index";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

type GenerateResult = Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>;

const FACE_CROP = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
const RESULT: SeasonResult = {
  season: "soft-autumn",
  runnerUp: "true-autumn",
  confidence: 0.62,
  agreement: "agree",
  traits: { temperature: 0.4, value: -0.1, clarity: -0.5 },
};
const ANSWERS: QuizAnswers = { veins: "green", jewelry: "gold" };
const VALID = {
  photo: "ok",
  summary:
    "Your skin has a soft golden warmth, your hair is a muted brown and your eyes are hazel.",
  agreementNote: "Green veins and gold jewelry point warm. Your soft brown hair points muted.",
};

function answer(output: unknown): GenerateResult {
  return {
    content: [{ type: "text", text: JSON.stringify(output) }],
    finishReason: { unified: "stop", raw: undefined },
    usage: {
      inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 20, text: 20, reasoning: undefined },
    },
    warnings: [],
  };
}

/** The one recorded model call. */
function onlyCall(model: MockLanguageModelV4) {
  expect(model.doGenerateCalls).toHaveLength(1);
  const [call] = model.doGenerateCalls;
  if (!call) throw new Error("no model call");
  return call;
}

const modelReturning = (output: unknown) =>
  new MockLanguageModelV4({ doGenerate: async () => answer(output) });

const run = (
  model: MockLanguageModelV4,
  claimSlot: () => Promise<SlotClaim> = async () => "granted",
) =>
  generateReportText({ faceCrop: FACE_CROP, result: RESULT, answers: ANSWERS, model, claimSlot });

beforeEach(() => {
  vi.mocked(Sentry.captureException).mockClear();
  vi.mocked(Sentry.flush).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("one vision call", () => {
  /** {@link openspec/specs/report-text/spec.md#scenario-a-valid-answer} */
  it("returns the personal text after exactly one call", async () => {
    const model = modelReturning(VALID);
    expect(await run(model)).toEqual({
      kind: "personal",
      summary: VALID.summary,
      agreementNote: VALID.agreementNote,
      photo: "ok",
    });
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-a-summary-over-its-limit} */
  it("rejects a summary over its limit as invalid, after one call", async () => {
    const model = modelReturning({ ...VALID, summary: "a".repeat(701) });
    expect(await run(model)).toEqual({ kind: "static", reason: "invalid" });
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-an-unknown-verdict} */
  it("rejects an unknown verdict as invalid, after one call", async () => {
    const model = modelReturning({ ...VALID, photo: "sunglasses" });
    expect(await run(model)).toEqual({ kind: "static", reason: "invalid" });
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-an-invalid-answer} */
  it("does not retry output that fails the schema", async () => {
    const model = modelReturning({ ...VALID, season: "true-winter" });
    expect(await run(model)).toEqual({ kind: "static", reason: "invalid" });
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-a-provider-error} */
  it("does not retry a retryable provider error", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({
          message: "overloaded",
          url: "https://ai-gateway.vercel.sh",
          requestBodyValues: {},
          statusCode: 503,
          isRetryable: true,
        });
      },
    });
    expect(await run(model)).toEqual({ kind: "static", reason: "failed" });
    expect(model.doGenerateCalls).toHaveLength(1);
  });
});

describe("the daily slot", () => {
  /** {@link openspec/specs/report-text/spec.md#scenario-cap-reached} */
  it("makes no call when the cap is reached", async () => {
    const model = modelReturning(VALID);
    expect(await run(model, async () => "capped" as const)).toEqual({
      kind: "static",
      reason: "capped",
    });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-counter-unreachable} */
  it("makes no call when the counter is unavailable", async () => {
    const model = modelReturning(VALID);
    expect(await run(model, async () => "unavailable" as const)).toEqual({
      kind: "static",
      reason: "cap-unavailable",
    });
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});

describe("a slow call", () => {
  /** {@link openspec/specs/report-text/spec.md#scenario-a-call-that-hangs} */
  it("is aborted after 20 s", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const model = new MockLanguageModelV4({
      doGenerate: ({ abortSignal }) => {
        signal = abortSignal;
        return new Promise((_, reject) =>
          abortSignal?.addEventListener("abort", () => reject(abortSignal.reason)),
        );
      },
    });
    let settled = false;
    const pending = run(model).finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(19_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ kind: "static", reason: "timeout" });
    expect(signal?.aborted).toBe(true);
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(String(vi.mocked(Sentry.captureException).mock.calls[0]?.[0])).toContain("timeout");
  });
});

describe("the photo double-check", () => {
  /** {@link openspec/specs/report-text/spec.md#scenario-two-faces} */
  it.each(["several-faces", "no-face"] as const)("rejects %s with no text", async (photo) => {
    expect(await run(modelReturning({ ...VALID, photo }))).toEqual({
      kind: "rejected",
      problem: photo,
    });
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-heavy-makeup} */
  it.each(["heavy-makeup", "filter"] as const)("keeps the text with %s", async (photo) => {
    expect(await run(modelReturning({ ...VALID, photo }))).toEqual({
      kind: "personal",
      summary: VALID.summary,
      agreementNote: VALID.agreementNote,
      photo,
    });
  });
});

describe("the request", () => {
  /** {@link openspec/specs/report-text/spec.md#scenario-the-request} */
  it("names the season and asks for no season back", async () => {
    const model = modelReturning(VALID);
    await run(model);
    const call = onlyCall(model);
    expect(JSON.stringify(call.prompt)).toContain("Soft Autumn");
    expect(call.responseFormat).toMatchObject({ type: "json" });
    const schema = (call.responseFormat as { schema: { properties: Record<string, unknown> } })
      .schema;
    expect(Object.keys(schema.properties).sort()).toEqual(["agreementNote", "photo", "summary"]);
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-the-requests-image-and-options} */
  it("carries exactly the face crop and asks for zero data retention", async () => {
    const model = modelReturning(VALID);
    await run(model);
    const call = onlyCall(model);
    const files = call.prompt.flatMap((m) =>
      m.role === "user" ? m.content.filter((p) => p.type === "file") : [],
    );
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ mediaType: "image/jpeg", data: { type: "data" } });
    const data = (files[0]?.data as { data: Uint8Array }).data;
    expect(new Uint8Array(data)).toEqual(FACE_CROP);
    expect(call.providerOptions).toMatchObject({ gateway: { zeroDataRetention: true } });
  });
});

describe("reporting", () => {
  /** {@link openspec/specs/report-text/spec.md#scenario-an-invalid-answer-is-reported} */
  it("reports an invalid answer once and awaits the flush", async () => {
    let release!: (v: boolean) => void;
    vi.mocked(Sentry.flush).mockImplementationOnce(() => new Promise((r) => (release = r)));
    let settled = false;
    const pending = run(modelReturning({ ...VALID, photo: "sunglasses" })).finally(
      () => (settled = true),
    );
    await vi.waitFor(() => expect(Sentry.flush).toHaveBeenCalledTimes(1));
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const error = vi.mocked(Sentry.captureException).mock.calls[0]?.[0];
    expect(String(error)).toContain("invalid");
    await Promise.resolve();
    expect(settled).toBe(false);
    release(true);
    expect(await pending).toEqual({ kind: "static", reason: "invalid" });
  });

  /** {@link openspec/specs/report-text/spec.md#requirement-failures-are-reported-the-cap-is-not} */
  it.each<[FallbackReason, MockLanguageModelV4, SlotClaim]>([
    [
      "failed",
      new MockLanguageModelV4({ doGenerate: () => Promise.reject(new Error("boom")) }),
      "granted",
    ],
    ["cap-unavailable", modelReturning(VALID), "unavailable"],
  ])("reports %s", async (reason, model, slot) => {
    expect(await run(model, async () => slot)).toEqual({ kind: "static", reason });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(Sentry.captureException).mock.calls[0]?.[0])).toContain(reason);
    expect(Sentry.flush).toHaveBeenCalledTimes(1);
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-the-cap-is-not-reported} */
  it("reports nothing when capped", async () => {
    await run(modelReturning(VALID), async () => "capped" as const);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.flush).not.toHaveBeenCalled();
  });
});
