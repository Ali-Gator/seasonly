import { REPORT_ID } from "@/lib/draping/crops";
import { recordInterest } from "@/lib/interest/record";
import { withErrorCapture } from "@/lib/observability/with-error-capture";

/**
 * Records one interest per report and answers the latest address for the clicked note. A
 * malformed id is refused before any database request.
 *
 * {@link openspec/specs/interest-button/spec.md#requirement-a-tap-records-one-interest-per-report}
 */
export const POST = withErrorCapture(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    if (!REPORT_ID.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
    const outcome = await recordInterest(id);
    if (outcome.kind === "unknown") return Response.json({ error: "Not found" }, { status: 404 });
    if (outcome.kind === "failed")
      return Response.json({ error: "Could not store" }, { status: 500 });
    return Response.json({ ok: true, email: outcome.email });
  },
);
