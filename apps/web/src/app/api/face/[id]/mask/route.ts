import { readMask, REPORT_ID } from "@/lib/draping/crops";
import { withErrorCapture } from "@/lib/observability/with-error-capture";

/**
 * The stored outline of a report's face crop, which cuts the face out in its draping preview.
 * Served exactly as the face route serves the crop.
 *
 * {@link openspec/specs/draping-preview/spec.md#requirement-the-outline-route-serves-a-stored-outline-and-nothing-else}
 */
export const GET = withErrorCapture(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const mask = REPORT_ID.test(id) ? await readMask(id) : null;
    if (!mask) return new Response("Not found", { status: 404 });
    return new Response(mask, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  },
);
