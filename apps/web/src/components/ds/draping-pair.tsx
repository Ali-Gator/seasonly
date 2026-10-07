import type { Swatch } from "@seasonly/analysis";

import { cx, Icon } from "./icon";
import { Slot } from "./slot";

export interface DrapingPairProps {
  best: Swatch;
  worst: Swatch;
  /** The same face image on both sides; without it, each frame shows a slot labeled "Face". */
  faceSrc?: string;
  faceAlt?: string;
  className?: string;
}

function Drape({
  kind,
  color,
  faceSrc,
  faceAlt,
}: { kind: "best" | "worst"; color: Swatch } & Pick<DrapingPairProps, "faceSrc" | "faceAlt">) {
  const best = kind === "best";
  return (
    <figure className="sn-drape">
      <div className="sn-drape__frame" style={{ background: color.hex }}>
        <Slot src={faceSrc} alt={faceAlt} label="Face" className="sn-drape__face" />
      </div>
      <figcaption>
        <span className={`sn-drape__verdict sn-drape__verdict--${kind}`}>
          <Icon name={best ? "check" : "cross"} size={14} />
          {best ? "Best" : "Worst"}
        </span>
        <span className="sn-swatch__name">{color.name}</span>
        <span className="sn-swatch__hex">{color.hex.toUpperCase()}</span>
      </figcaption>
    </figure>
  );
}

/**
 * The face on its best color next to its worst, each verdict in words and an icon. Ported from
 * the design system's bundle.js.
 *
 * {@link openspec/specs/ui-components/spec.md#requirement-a-draping-pair-tells-best-from-worst-in-words}
 */
export function DrapingPair({ best, worst, faceSrc, faceAlt, className }: DrapingPairProps) {
  return (
    <div className={cx("sn-draping", className)}>
      <Drape kind="best" color={best} faceSrc={faceSrc} faceAlt={faceAlt} />
      <Drape kind="worst" color={worst} faceSrc={faceSrc} faceAlt={faceAlt} />
    </div>
  );
}
