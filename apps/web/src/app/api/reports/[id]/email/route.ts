import { checkBotId } from "botid/server";
import { after } from "next/server";

import { REPORT_ID } from "@/lib/draping/crops";
import { parseEmail } from "@/lib/email/address";
import { renderReportEmail } from "@/lib/email/render";
import { sendReportEmail } from "@/lib/email/send";
import { storeReportEmail } from "@/lib/email/store";
import { withErrorCapture } from "@/lib/observability/with-error-capture";

/**
 * Bot check, then the id and the address, then the store, which answers at once; the email is
 * sent after the answer. Worst case: a 1 s bot check and a 3 s store with a 2 s flush before the
 * answer, then a 5 s send with a 2 s flush after it: 13 s.
 *
 * {@link openspec/specs/email-capture/spec.md#requirement-sending-the-form-stores-the-address-and-opens-the-report}
 */
export const maxDuration = 30;

export const POST = withErrorCapture(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    // As on the analyze route: only a deployment runs the real check.
    const bot = await checkBotId({
      developmentOptions: { isDevelopment: !process.env.VERCEL_ENV },
    });
    if (bot.isBot) return Response.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!REPORT_ID.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
    const body: unknown = await request.json().catch(() => null);
    const email = parseEmail((body as { email?: unknown } | null)?.email);
    if (!email) return Response.json({ error: "Invalid email" }, { status: 400 });

    const stored = await storeReportEmail(id, email);
    switch (stored.kind) {
      case "failed":
        return Response.json({ error: "Could not store" }, { status: 500 });
      case "unknown":
        return Response.json({ error: "Not found" }, { status: 404 });
      case "limit":
        return Response.json({ error: "Too many emails for this report" }, { status: 429 });
    }
    const content = renderReportEmail({ id, season: stored.season, quizOnly: stored.quizOnly });
    after(() => sendReportEmail(email, content, { emailId: stored.emailId, reportId: id }));
    return Response.json({ ok: true });
  },
);
