import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendReportEmail } from "./send";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

const TO = "maya.reyes@gmail.com";
const CONTENT = { subject: "Your Soft Autumn color report", html: "<p>Hi</p>", text: "Hi" };
const IDS = { emailId: 41, reportId: "k7m2qxAAAAAAAAAAAAAAAA" };

/** Everything Sentry was given, as one string, to look for the address in. */
const reported = () =>
  JSON.stringify(vi.mocked(Sentry.captureException).mock.calls, (_, v) =>
    v instanceof Error ? { message: v.message, cause: v.cause } : v,
  );

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("sendReportEmail", () => {
  /** {@link openspec/specs/email-capture/spec.md#requirement-the-report-email-carries-the-report-link} */
  it("posts the email to Resend with an idempotency key", async () => {
    const fetch = vi.fn(async () => Response.json({ id: "e1" }));
    await sendReportEmail(TO, CONTENT, IDS, { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer re_test_key");
    expect(headers.get("Idempotency-Key")).toBe("report-email/41");
    expect(JSON.parse(String(init.body))).toEqual({
      from: "Seasonly <report@seasonly.me>",
      to: [TO],
      subject: CONTENT.subject,
      html: CONTENT.html,
      text: CONTENT.text,
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-the-provider-is-down} */
  it("reports a 500 to Sentry with the status and name, never the address", async () => {
    const fetch = vi.fn(async () =>
      Response.json(
        { statusCode: 500, name: "internal_server_error", message: `Could not send to ${TO}` },
        { status: 500 },
      ),
    );
    await sendReportEmail(TO, CONTENT, IDS, { fetch });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(reported()).toContain("500");
    expect(reported()).toContain("internal_server_error");
    expect(reported()).toContain(IDS.reportId);
    expect(reported()).not.toContain(TO);
    expect(Sentry.flush).toHaveBeenCalled();
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-a-send-fails} */
  it("gives up after 5 s and reports the timeout without the address", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    const pending = sendReportEmail(TO, CONTENT, IDS, { fetch });
    await vi.advanceTimersByTimeAsync(4999);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(signal?.aborted).toBe(true);
    expect(reported()).toMatch(/timed out/);
    expect(reported()).not.toContain(TO);
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-local-run-without-a-key} */
  it("sends nothing and reports nothing without a key off Vercel", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("VERCEL_ENV", "");
    const fetch = vi.fn();
    await sendReportEmail(TO, CONTENT, IDS, { fetch });
    expect(fetch).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/email-capture/spec.md#requirement-a-failed-send-never-holds-back-the-report} */
  it("reports the missing key on a deployment", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("VERCEL_ENV", "preview");
    const fetch = vi.fn();
    await sendReportEmail(TO, CONTENT, IDS, { fetch });
    expect(fetch).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(reported()).toContain("RESEND_API_KEY");
    expect(reported()).not.toContain(TO);
  });
});
