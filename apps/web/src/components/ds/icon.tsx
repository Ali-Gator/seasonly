/**
 * Inline glyphs, drawn in currentColor. Placeholders until an icon set is chosen. Ported from the
 * design system's bundle.js.
 *
 * @see openspec/specs/ui-components/spec.md
 */
const PATHS = {
  check: "M4 10.5l3.5 3.5L16 5.5",
  cross: "M5.5 5.5l9 9M14.5 5.5l-9 9",
  lock: "M6 9V7a4 4 0 0 1 8 0v2M4.5 9h11v8h-11z",
  camera: "M3 6.5h3l1.5-2h5l1.5 2h3v9.5H3zM10 13.5a2.75 2.75 0 1 0 0-5.5a2.75 2.75 0 0 0 0 5.5z",
  upload: "M10 13V3.5M6 7.5l4-4 4 4M3.5 13v3.5h13V13",
  sun: "M10 13a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4",
  clock: "M10 17.5a7.5 7.5 0 1 0 0-15a7.5 7.5 0 0 0 0 15zM10 6v4.5l3 2",
  trash: "M3.5 5.5h13M8 5.5v-2h4v2M5 5.5l1 11h8l1-11",
  mail: "M3 5h14v10H3zM3 5.5l7 5.5 7-5.5",
  info: "M10 17.5a7.5 7.5 0 1 0 0-15a7.5 7.5 0 0 0 0 15zM10 9v5M10 6.25v.5",
  "arrow-right": "M4 10h12M11 5l5 5-5 5",
};

export type IconName = keyof typeof PATHS;

export interface IconProps {
  name: IconName;
  size?: number;
  /** Accessible name; omit for a decorative icon. */
  label?: string;
  className?: string;
}

export function Icon({ name, size = 16, label, className }: IconProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg
      className={cx("sn-icon", className)}
      viewBox="0 0 20 20"
      width={size}
      height={size}
      focusable="false"
      {...a11y}
    >
      <path
        d={PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Joins the truthy class names, as the bundle's `cx` does. */
export function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(" ");
}
