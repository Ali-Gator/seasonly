import { readCrop, REPORT_ID } from "@/lib/draping/crops";
import { withErrorCapture } from "@/lib/observability/with-error-capture";

/**
 * The stored face crop of a report, for its draping preview. Never cached, so no browser or CDN
 * keeps the face past the crop's deletion. A store error is thrown, so Sentry gets it and Next
 * answers 500.
 *
 * {@link openspec/specs/draping-preview/spec.md#requirement-the-face-route-serves-a-stored-crop-and-nothing-else}
 */
export const GET = withErrorCapture(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const crop = REPORT_ID.test(id) ? await readCrop(id) : null;
    if (!crop) return new Response("Not found", { status: 404 });
    return new Response(crop, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  },
);
