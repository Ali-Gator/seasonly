import * as Sentry from "@sentry/nextjs";

import { withTimeout } from "@/lib/observability/with-timeout";

import type { EmailContent } from "./render";

/**
 * Sends one report email through Resend's API. Never throws: a failed or hanging send (5 s) is
 * reported to Sentry with the report id, Resend's status and its error name. Never the address,
 * and never Resend's message, which can echo it.
 *
 * {@link openspec/specs/email-capture/spec.md#requirement-a-failed-send-never-holds-back-the-report}
 */
export const FROM = "Seasonly <report@seasonly.me>";

export async function sendReportEmail(
  to: string,
  { subject, html, text }: EmailContent,
  { emailId, reportId }: { emailId: number; reportId: string },
  { fetch = globalThis.fetch }: { fetch?: typeof globalThis.fetch } = {},
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // A local run sends nothing silently; a deployment without the key is a misconfiguration.
    if (process.env.VERCEL_ENV) {
      Sentry.captureException(new Error("RESEND_API_KEY is not set"), { extra: { reportId } });
      await Sentry.flush(2000);
    }
    return;
  }
  await withTimeout(
    "report email send failed",
    async (signal) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          // A retried request with the same key is sent once.
          "Idempotency-Key": `report-email/${emailId}`,
        },
        body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
        signal,
      });
      if (res.ok) return;
      const body: unknown = await res.json().catch(() => null);
      const name = (body as { name?: unknown } | null)?.name;
      throw new Error(`Resend answered ${res.status}${typeof name === "string" ? ` ${name}` : ""}`);
    },
    { ms: 5000, extra: { reportId } },
  );
}
