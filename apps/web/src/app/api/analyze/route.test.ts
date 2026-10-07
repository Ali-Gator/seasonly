/**
 * The analyze route with its seams mocked: BotID, the report-text call, the store and the crop
 * store. `after` runs its callback at once, so a scheduled crop upload is seen as a call.
 *
 * @see openspec/specs/season-reveal/spec.md
 */
import { checkBotId } from "botid/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BOTID_PROTECT } from "@/lib/abuse/botid";
import { saveReport } from "@/lib/analysis/store";
import { storeCrop } from "@/lib/draping/crops";
import { generateReportText } from "@/lib/report-text";

import { maxDuration, POST } from "./route";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  createTransport: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));
vi.mock("botid/server", () => ({ checkBotId: vi.fn() }));
vi.mock("@/lib/report-text", () => ({ generateReportText: vi.fn() }));
vi.mock("@/lib/analysis/store", () => ({ saveReport: vi.fn() }));
vi.mock("@/lib/draping/crops", () => ({ storeCrop: vi.fn() }));
// Outside a request scope the real `after` throws; run its callback at once instead.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn((task: () => unknown) => void task()),
}));

const human = { isHuman: true, isBot: false, isVerifiedBot: false, bypassed: false };
const REPORT_ID = "AAAAAAAAAAAAAAAAAAAAAA";

/** A JPEG's first bytes, then filler. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
/** Soft Autumn's reference point. */
const SOFT_AUTUMN = { temperature: 0.4, value: 0, clarity: -0.8 };

function request(fields: {
  answers?: unknown;
  traits?: unknown;
  crop?: Blob;
  raw?: Record<string, string>;
}): Request {
  const form = new FormData();
  if (fields.answers !== undefined) form.set("answers", JSON.stringify(fields.answers));
  if (fields.traits !== undefined) form.set("traits", JSON.stringify(fields.traits));
  if (fields.crop) form.set("crop", fields.crop, "crop.jpg");
  for (const [k, v] of Object.entries(fields.raw ?? {})) form.set(k, v);
  return new Request("http://localhost/api/analyze", { method: "POST", body: form });
}

const jpeg = (bytes: Uint8Array<ArrayBuffer> = JPEG) => new Blob([bytes], { type: "image/jpeg" });
const photo = (extra: Parameters<typeof request>[0] = {}) =>
  request({ answers: {}, traits: SOFT_AUTUMN, crop: jpeg(), ...extra });

beforeEach(() => {
  vi.mocked(checkBotId).mockResolvedValue(human);
  vi.mocked(generateReportText).mockResolvedValue({
    kind: "personal",
    summary: "Your coloring is warm and soft.",
    agreementNote: "Your photo points warm.",
    photo: "ok",
  });
  vi.mocked(saveReport).mockResolvedValue(REPORT_ID);
});

afterEach(() => vi.clearAllMocks());

const nothingSpent = () => {
  expect(generateReportText).not.toHaveBeenCalled();
  expect(saveReport).not.toHaveBeenCalled();
};

describe("POST /api/analyze validation", () => {
  const big = new Uint8Array(512 * 1024 + 1);
  big.set(JPEG);
  const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])], {
    type: "image/png",
  });

  it.each([
    ["no answers", request({ traits: SOFT_AUTUMN, crop: jpeg() })],
    ["answers not JSON", request({ raw: { answers: "{" } })],
    ["an unknown question", request({ answers: { eyes: "blue" } })],
    ["an unknown value", request({ answers: { veins: "pink" } })],
    ["a missing trait", photo({ traits: { temperature: 0.4, value: 0 } })],
    ["a trait that is not a number", photo({ traits: { ...SOFT_AUTUMN, value: "0" } })],
    ["traits without a crop", request({ answers: {}, traits: SOFT_AUTUMN })],
    ["a crop without traits", request({ answers: {}, crop: jpeg() })],
    ["a crop over 512 KB", request({ answers: {}, traits: SOFT_AUTUMN, crop: jpeg(big) })],
    [
      "a crop typed JPEG without the JPEG bytes",
      request({ answers: {}, traits: SOFT_AUTUMN, crop: jpeg(new Uint8Array([1, 2, 3, 4])) }),
    ],
  ])("answers 400 for %s, spending nothing", async (_name, req) => {
    expect((await POST(req)).status).toBe(400);
    nothingSpent();
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-a-trait-out-of-range} */
  it("answers 400 for a temperature of 3, spending nothing", async () => {
    const res = await POST(
      request({ answers: {}, traits: { ...SOFT_AUTUMN, temperature: 3 }, crop: jpeg() }),
    );
    expect(res.status).toBe(400);
    nothingSpent();
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-a-crop-that-is-not-a-jpeg} */
  it("answers 400 for a PNG crop, spending nothing", async () => {
    const res = await POST(request({ answers: {}, traits: SOFT_AUTUMN, crop: png }));
    expect(res.status).toBe(400);
    nothingSpent();
  });
});

describe("POST /api/analyze", () => {
  /** {@link openspec/specs/season-reveal/spec.md#scenario-a-photo-and-answers} */
  it("classifies on the server and ignores a client-sent season", async () => {
    const res = await POST(
      request({
        answers: {},
        traits: SOFT_AUTUMN,
        crop: jpeg(),
        raw: { season: "bright-winter", confidence: "1" },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      kind: "result",
      reportId: REPORT_ID,
      season: "soft-autumn",
      agreement: "photo-only",
      confidence: 1,
      photo: "ok",
      text: "personal",
    });
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-a-photo-analysis} */
  it("requests report text once, with exactly the uploaded crop", async () => {
    await POST(photo({ answers: { veins: "green" } }));
    expect(generateReportText).toHaveBeenCalledTimes(1);
    const [args] = vi.mocked(generateReportText).mock.calls[0] ?? [];
    expect(args?.faceCrop).toEqual(JPEG);
    expect(args?.answers).toEqual({ veins: "green" });
    expect(args?.result.season).toBe("soft-autumn");
    expect(saveReport).toHaveBeenCalledWith(
      expect.objectContaining({
        season: "soft-autumn",
        photoVerdict: "ok",
        textSource: "personal",
        summary: "Your coloring is warm and soft.",
        agreementNote: "Your photo points warm.",
      }),
    );
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-a-quiz-only-analysis} */
  it("makes no report-text call for a quiz-only request and stores the static source", async () => {
    const res = await POST(request({ answers: { veins: "green", jewelry: "gold" } }));
    const body = await res.json();
    expect(generateReportText).not.toHaveBeenCalled();
    expect(body).toMatchObject({ kind: "result", text: "quiz-only", photo: null });
    expect(saveReport).toHaveBeenCalledWith(
      expect.objectContaining({
        textSource: "quiz-only",
        photoVerdict: null,
        summary: null,
        agreementNote: null,
      }),
    );
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-daily-cap-is-reached} */
  it("passes a fallback reason on as the text source, with no verdict", async () => {
    vi.mocked(generateReportText).mockResolvedValue({ kind: "static", reason: "capped" });
    expect(await (await POST(photo())).json()).toMatchObject({ text: "capped", photo: null });
    expect(saveReport).toHaveBeenCalledWith(
      expect.objectContaining({ textSource: "capped", photoVerdict: null, summary: null }),
    );
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-several-faces} */
  it("stores nothing for a rejected photo and answers with the problem", async () => {
    vi.mocked(generateReportText).mockResolvedValue({
      kind: "rejected",
      problem: "several-faces",
    });
    const res = await POST(photo());
    expect(await res.json()).toEqual({ kind: "rejected", problem: "several-faces" });
    expect(saveReport).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-answers-that-cancel-out} */
  it("answers no-result for answers that cancel out, storing nothing", async () => {
    const res = await POST(request({ answers: { veins: "green", jewelry: "silver" } }));
    expect(await res.json()).toEqual({ kind: "no-result", reason: "answers-cancel" });
    expect(await (await POST(request({ answers: { veins: "unsure" } }))).json()).toEqual({
      kind: "no-result",
      reason: "no-answers",
    });
    nothingSpent();
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-database-is-down} */
  it("still answers the season with a null id when the save fails", async () => {
    vi.mocked(saveReport).mockResolvedValue(null);
    expect(await (await POST(photo())).json()).toMatchObject({
      kind: "result",
      season: "soft-autumn",
      reportId: null,
    });
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-declared-limit} */
  it("declares a 60 s limit", () => {
    expect(maxDuration).toBe(60);
  });
});

describe("crop storage", () => {
  /** {@link openspec/specs/draping-preview/spec.md#scenario-a-photo-result} */
  it("schedules the crop under the report id for a personal photo result", async () => {
    await POST(photo());
    expect(storeCrop).toHaveBeenCalledTimes(1);
    expect(storeCrop).toHaveBeenCalledWith(REPORT_ID, JPEG);
  });

  /** {@link openspec/specs/draping-preview/spec.md#scenario-a-fallback-result-with-a-photo} */
  it("schedules the crop for a fallback photo result too", async () => {
    vi.mocked(generateReportText).mockResolvedValue({ kind: "static", reason: "capped" });
    await POST(photo());
    expect(storeCrop).toHaveBeenCalledWith(REPORT_ID, JPEG);
  });

  /** {@link openspec/specs/draping-preview/spec.md#scenario-nothing-to-store-under} */
  it("stores nothing for quiz-only, rejected, no-result or an unsaved result", async () => {
    await POST(request({ answers: { veins: "green", jewelry: "gold" } }));
    await POST(request({ answers: { veins: "green", jewelry: "silver" } }));
    vi.mocked(saveReport).mockResolvedValueOnce(null);
    await POST(photo());
    vi.mocked(generateReportText).mockResolvedValue({ kind: "rejected", problem: "several-faces" });
    await POST(photo());
    expect(storeCrop).not.toHaveBeenCalled();
  });
});

describe("bot protection", () => {
  /** {@link openspec/specs/abuse-controls/spec.md#scenario-a-bot} */
  it("answers 403 to a bot before validating, spending nothing", async () => {
    vi.mocked(checkBotId).mockResolvedValue({ ...human, isHuman: false, isBot: true });
    expect((await POST(photo())).status).toBe(403);
    expect((await POST(request({ raw: { answers: "{" } }))).status).toBe(403);
    nothingSpent();
  });

  /** {@link openspec/specs/abuse-controls/spec.md#requirement-bots-are-refused-on-the-analyze-route} */
  it("runs the real check only on a Vercel deployment", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await POST(photo());
    vi.stubEnv("VERCEL_ENV", "");
    await POST(photo());
    vi.unstubAllEnvs();
    expect(vi.mocked(checkBotId).mock.calls.map(([c]) => c?.developmentOptions)).toEqual([
      { isDevelopment: false },
      { isDevelopment: true },
    ]);
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-browser-protects-the-request} */
  it("protects POST /api/analyze in the browser", () => {
    expect(BOTID_PROTECT).toContainEqual({ path: "/api/analyze", method: "POST" });
  });
});
