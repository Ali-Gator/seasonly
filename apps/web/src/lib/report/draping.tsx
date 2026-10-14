"use client";

import type { Swatch } from "@seasonly/analysis";
import { useEffect, useRef, useState } from "react";

import { DrapingPair } from "@/components/ds";

/**
 * The draping preview on the stored face. The face route answers 404 once the crop is gone, so
 * the image's own error switches to the two colors alone; the server does not ask storage first.
 *
 * {@link openspec/specs/report-page/spec.md#requirement-the-draping-preview-shows-the-stored-face}
 */
export function DrapingView({
  id,
  best,
  worst,
  deleted,
  maskSrc,
}: {
  id: string;
  best: Swatch;
  worst: Swatch;
  deleted: boolean;
  /** The face's outline, once it has loaded. */
  maskSrc?: string;
}) {
  return (
    <>
      {deleted ? (
        <DrapingPair best={best} worst={worst} className="lg:max-w-[560px]" />
      ) : (
        <DrapingPair
          best={best}
          worst={worst}
          faceSrc={`/api/face/${id}`}
          faceAlt="Your face"
          faceMaskSrc={maskSrc}
          className="lg:max-w-[560px]"
        />
      )}
      {deleted && (
        <p className="text-(--ink-muted)">
          We couldn&apos;t load your photo, so this shows the two colors only.
        </p>
      )}
    </>
  );
}

/**
 * The draping preview, its face cut out once the outline has loaded. The outline is fetched once
 * and passed as an object URL: the route is `no-store`, so a CSS mask on the route would fetch it
 * again, and a mask that fails to load hides the face. Until it loads or fails, at most 4 s, the
 * face images are hidden, not removed (`sn-face-pending` in globals.css, which also shows them
 * after 4 s without a script), so the background never flashes and their errors still count.
 *
 * {@link openspec/specs/report-page/spec.md#requirement-the-draping-preview-cuts-the-stored-face-out-of-its-background}
 */
export function ReportDraping(props: { id: string; best: Swatch; worst: Swatch }) {
  const [deleted, setDeleted] = useState(false);
  /** `undefined` while pending, `null` once it failed: the face then shows as it is. */
  const [maskSrc, setMaskSrc] = useState<string | null>();
  const wrapper = useRef<HTMLDivElement>(null);
  const { id } = props;
  useEffect(() => {
    let url: string | undefined;
    let live = true;
    // The same 4 s as the CSS reveal: a hung outline never keeps the face hidden.
    fetch(`/api/face/${id}/mask`, { signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? r.blob() : null))
      // Decoded first: CSS treats a mask it cannot decode as transparent, hiding the face.
      .then(async (blob) => {
        if (!blob) return null;
        (await createImageBitmap(blob)).close();
        return blob;
      })
      .catch(() => null)
      .then((blob) => {
        if (!live) return;
        url = blob ? URL.createObjectURL(blob) : undefined;
        setMaskSrc(url ?? null);
      });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  useEffect(() => {
    // Read from the DOM: an image can fail before hydration, when a React onError would miss it.
    const images = [...(wrapper.current?.querySelectorAll("img") ?? [])];
    const fail = () => setDeleted(true);
    for (const img of images) {
      if (img.complete && img.naturalWidth === 0) fail();
      img.addEventListener("error", fail);
    }
    return () => images.forEach((img) => img.removeEventListener("error", fail));
  }, []);
  return (
    <div ref={wrapper} className={maskSrc === undefined ? "contents sn-face-pending" : "contents"}>
      <DrapingView {...props} deleted={deleted} maskSrc={maskSrc ?? undefined} />
    </div>
  );
}
