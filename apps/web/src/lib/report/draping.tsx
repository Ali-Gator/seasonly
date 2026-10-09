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
}: {
  id: string;
  best: Swatch;
  worst: Swatch;
  deleted: boolean;
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
          className="lg:max-w-[560px]"
        />
      )}
      {deleted && (
        <p className="text-(--ink-muted)">
          Your photo has been deleted, so this shows the two colors only.
        </p>
      )}
    </>
  );
}

export function ReportDraping(props: { id: string; best: Swatch; worst: Swatch }) {
  const [deleted, setDeleted] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
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
    <div ref={wrapper} className="contents">
      <DrapingView {...props} deleted={deleted} />
    </div>
  );
}
