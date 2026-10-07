import { classify } from "@seasonly/analysis";
import { checkBotId } from "botid/server";
import { after } from "next/server";

import { type AnalyzeResponse, parseAnalyzeRequest } from "@/lib/analysis/request";
import { saveReport, type TextSource } from "@/lib/analysis/store";
import { storeCrop } from "@/lib/draping/crops";
import { withErrorCapture } from "@/lib/observability/with-error-capture";
import { generateReportText, type PhotoVerdict } from "@/lib/report-text";

/**
 * Bot check, validation, classification, one report-text call with a photo, then the save, and the
 * face crop's upload after the response. Worst case: a 3 s slot claim, a 20 s model call and a 3 s
 * save, then a 3 s upload: 29 s.
 *
 * {@link openspec/specs/season-reveal/spec.md#requirement-the-route-outlasts-its-slowest-path}
 */
export const maxDuration = 60;

export const POST = withErrorCapture(async (request: Request) => {
  // BotID treats NODE_ENV as "local"; off Vercel (next start in CI) it would throw for want of
  // an OIDC token. VERCEL_ENV is set on every deployment, so only those run the real check.
  const bot = await checkBotId({
    developmentOptions: { isDevelopment: !process.env.VERCEL_ENV },
  });
  if (bot.isBot) return Response.json({ error: "Forbidden" }, { status: 403 });

  const input = await parseAnalyzeRequest(request);
  if (!input) return Response.json({ error: "Invalid request" }, { status: 400 });

  // The server decides the season; nothing the client sends besides traits and answers is read.
  const result = classify({ photo: input.photo?.traits ?? null, answers: input.answers });
  if (result.season === null)
    return Response.json({ kind: "no-result", reason: result.reason } satisfies AnalyzeResponse);

  let text: TextSource = "quiz-only";
  let photo: PhotoVerdict | null = null;
  let summary: string | null = null;
  let agreementNote: string | null = null;
  if (input.photo) {
    const report = await generateReportText({
      faceCrop: input.photo.crop,
      result,
      answers: input.answers,
    });
    if (report.kind === "rejected")
      return Response.json({ kind: "rejected", problem: report.problem } satisfies AnalyzeResponse);
    if (report.kind === "static") text = report.reason;
    else {
      text = "personal";
      ({ photo, summary, agreementNote } = report);
    }
  }

  const reportId = await saveReport({
    season: result.season,
    runnerUp: result.runnerUp,
    confidence: result.confidence,
    agreement: result.agreement,
    traits: result.traits,
    answers: input.answers,
    photoVerdict: photo,
    textSource: text,
    summary,
    agreementNote,
  });
  // Saved first, so a failed insert leaves no orphan crop.
  if (reportId && input.photo) {
    const { crop } = input.photo;
    after(() => storeCrop(reportId, crop));
  }
  return Response.json({
    kind: "result",
    reportId,
    season: result.season,
    agreement: result.agreement,
    confidence: result.confidence,
    photo,
    text,
  } satisfies AnalyzeResponse);
});
