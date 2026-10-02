import type { Swatch as Color } from "@seasonly/analysis";

import { cx } from "./icon";

export interface SwatchProps extends Color {
  size?: "md" | "lg";
  className?: string;
}

/**
 * One palette color: a chip hidden from assistive technology, then its name and uppercase hex as
 * text. Ported from the design system's bundle.js.
 *
 * @see openspec/specs/ui-components/spec.md
 */
export function Swatch({ name, hex, size, className }: SwatchProps) {
  return (
    <figure className={cx("sn-swatch", size === "lg" && "sn-swatch--lg", className)}>
      <div className="sn-swatch__chip" style={{ background: hex }} aria-hidden="true" />
      <figcaption>
        <span className="sn-swatch__name">{name}</span>
        <span className="sn-swatch__hex">{hex.toUpperCase()}</span>
      </figcaption>
    </figure>
  );
}

export interface SwatchGridProps {
  colors: readonly Color[];
  columns?: number;
  label?: string;
  className?: string;
}

export function SwatchGrid({ colors, columns = 4, label, className }: SwatchGridProps) {
  return (
    <ul
      className={cx("sn-swatch-grid", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      aria-label={label}
    >
      {colors.map((c) => (
        <li key={c.hex + c.name}>
          <Swatch hex={c.hex} name={c.name} />
        </li>
      ))}
    </ul>
  );
}
