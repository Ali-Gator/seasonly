import type { Swatch as Color } from "@seasonly/analysis";

import type { CSSProperties } from "react";

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
  /** Set as `--sn-cols`, so a page's column utility still wins (BL-63). */
  columns?: number;
  label?: string;
  className?: string;
  /** Keep the column count below 375 px, where a 4-column grid otherwise lays out in 3 (BL-57). */
  keepColumns?: boolean;
}

export function SwatchGrid({
  colors,
  columns = 4,
  label,
  className,
  keepColumns = false,
}: SwatchGridProps) {
  return (
    <ul
      className={cx("sn-swatch-grid", className)}
      style={{ "--sn-cols": columns } as CSSProperties}
      data-columns={keepColumns ? undefined : columns}
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

export interface SwatchStripProps {
  colors: readonly Color[];
  columns?: number;
  /** The list's accessible name, such as "True Autumn colors". */
  label: string;
  className?: string;
}

/**
 * Chips only, for a preview whose names are one tap away: each name is visually hidden text, so
 * a screen reader still reads it. Ported from the design system's bundle.js.
 *
 * {@link openspec/specs/ui-components/spec.md#requirement-a-swatch-strip-shows-chips-and-names-them-to-screen-readers}
 */
export function SwatchStrip({ colors, columns = 4, label, className }: SwatchStripProps) {
  return (
    <ul
      className={cx("sn-swatch-strip", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      aria-label={label}
    >
      {colors.map((c) => (
        <li key={c.hex + c.name}>
          <span
            className="sn-swatch-strip__chip"
            style={{ background: c.hex }}
            aria-hidden="true"
          />
          <span className="sn-visually-hidden">{c.name}</span>
        </li>
      ))}
    </ul>
  );
}
