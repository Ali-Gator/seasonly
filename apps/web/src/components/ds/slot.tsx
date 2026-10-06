import type { CSSProperties } from "react";

import { cx } from "./icon";

export interface SlotProps {
  src?: string;
  alt?: string;
  /** Shown in place of a missing image. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** Where a photo goes: the image, or a neutral labeled placeholder. Ported from bundle.js. */
export function Slot({ src, alt = "", label = "Photo", className, style }: SlotProps) {
  return (
    <div className={cx("sn-slot", className)} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs and placeholders */}
      {src ? <img src={src} alt={alt} /> : <span className="sn-slot__label">{label}</span>}
    </div>
  );
}
