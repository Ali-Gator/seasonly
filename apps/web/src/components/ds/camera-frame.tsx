import type { CSSProperties, ReactNode } from "react";

import { cx } from "./icon";
import { Slot } from "./slot";

export interface CameraFrameProps {
  /** The view: a live `<video>` or an `<img>`. Without one, a placeholder named by `label`. */
  children?: ReactNode;
  label?: string;
  caption?: string;
  /** The face guide oval; on by default. */
  guide?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Ported from the design system's bundle.js; the view is passed in as children instead of `src`.
 *
 * @see openspec/specs/ui-components/spec.md
 */
export function CameraFrame({
  children,
  label = "Camera",
  caption,
  guide = true,
  className,
  style,
}: CameraFrameProps) {
  return (
    <figure className={cx("sn-camera", className)} style={style}>
      <div className="sn-camera__view">
        {children ?? <Slot label={label} className="sn-camera__slot" />}
        {guide && <span className="sn-camera__oval" aria-hidden="true" />}
      </div>
      {caption && <figcaption className="sn-camera__caption">{caption}</figcaption>}
    </figure>
  );
}
