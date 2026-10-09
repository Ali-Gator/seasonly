/**
 * The report email route with its seams mocked: BotID, the store and the sender. `after` runs its
 * callback at once, so a scheduled send is seen as a call.
 *
 * @see openspec/specs/email-capture/spec.md
 */
import * as Sentry from "@sentry/nextjs";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendReportEmail } from "@/lib/email/send";
import { storeReportEmail } from "@/lib/email/store";

import { maxDuration, POST } from "./route";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  createTransport: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));
vi.mock("botid/server", () => ({ checkBotId: vi.fn() }));
vi.mock("@/lib/email/store", () => ({ storeReportEmail: vi.fn() }));
vi.mock("@/lib/email/send", () => ({ sendReportEmail: vi.fn() }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn((task: () => unknown) => void task()),
}));

const human = { isHuman: true, isBot: false, isVerifiedBot: false, bypassed: false };
const ID = "k7m2qxAAAAAAAAAAAAAAAA";

const post = (id: string, body: unknown) =>
  POST(
    new Request(`http://localhost/api/reports/${id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkBotId).mockResolvedValue(human);
  vi.mocked(storeReportEmail).mockResolvedValue({
    kind: "stored",
    emailId: 41,
    season: "soft-autumn",
    quizOnly: false,
  });
});

describe("POST /api/reports/<id>/email", () => {
  /** {@link openspec/specs/abuse-controls/spec.md#scenario-a-bot-on-the-email-route} */
  it("answers a bot 403 and reads nothing", async () => {
    vi.mocked(checkBotId).mockResolvedValue({ ...human, isHuman: false, isBot: true });
    expect((await post(ID, { email: "maya@example.com" })).status).toBe(403);
    expect(storeReportEmail).not.toHaveBeenCalled();
    expect(sendReportEmail).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/email-capture/spec.md#requirement-only-real-reports-take-an-address} */
  it("answers a malformed id 404 before any database request", async () => {
    expect((await post("short", { email: "maya@example.com" })).status).toBe(404);
    expect(storeReportEmail).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-the-route-gets-a-malformed-address} */
  it("answers a malformed address 400 and stores nothing", async () => {
    for (const body of [{ email: "not-an-email" }, {}, "not json"]) {
      expect((await post(ID, body)).status).toBe(400);
    }
    expect(storeReportEmail).not.toHaveBeenCalled();
    expect(sendReportEmail).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-an-unknown-id} */
  it("answers an unknown report 404 and sends nothing", async () => {
    vi.mocked(storeReportEmail).mockResolvedValue({ kind: "unknown" });
    expect((await post(ID, { email: "maya@example.com" })).status).toBe(404);
    expect(sendReportEmail).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-fourth-address} */
  it("answers the fourth address 429 and sends nothing", async () => {
    vi.mocked(storeReportEmail).mockResolvedValue({ kind: "limit" });
    expect((await post(ID, { email: "maya@example.com" })).status).toBe(429);
    expect(sendReportEmail).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-a-valid-address} */
  it("stores the lowercased address, answers 200, then sends one email", async () => {
    const res = await post(ID, { email: "Maya.Reyes@Gmail.com " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(storeReportEmail).toHaveBeenCalledWith(ID, "maya.reyes@gmail.com");
    expect(after).toHaveBeenCalledTimes(1);
    expect(sendReportEmail).toHaveBeenCalledTimes(1);
    const [to, content, ids] = vi.mocked(sendReportEmail).mock.calls[0] ?? [];
    expect(to).toBe("maya.reyes@gmail.com");
    expect(content?.subject).toBe("Your Soft Autumn color report");
    expect(content?.html).toContain(`https://seasonly.me/r/${ID}`);
    expect(ids).toEqual({ emailId: 41, reportId: ID });
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-the-database-is-down} */
  it("answers a failed store 500 and sends nothing", async () => {
    vi.mocked(storeReportEmail).mockResolvedValue({ kind: "failed" });
    expect((await post(ID, { email: "maya@example.com" })).status).toBe(500);
    expect(sendReportEmail).not.toHaveBeenCalled();
    // The store reports its own failure; the route adds no report that could carry the address.
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/email-capture/spec.md#requirement-a-failed-send-never-holds-back-the-report} */
  it("lasts the bot check, the store and the send", () => {
    expect(maxDuration).toBeGreaterThanOrEqual(15);
  });
});
