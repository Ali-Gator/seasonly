import { createElement } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  Clock,
  type IconNode,
  Info,
  Lock,
  Mail,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide";

/**
 * The design system's named glyphs: Lucide's shapes (from the `lucide` package, so no `lucide-*`
 * class reaches the page), drawn in currentColor. The design system's bundle.js draws the same.
 *
 * @see openspec/specs/ui-components/spec.md
 */
const GLYPHS = {
  check: Check,
  cross: X,
  lock: Lock,
  camera: Camera,
  upload: Upload,
  sun: Sun,
  clock: Clock,
  trash: Trash2,
  mail: Mail,
  info: Info,
  "arrow-right": ArrowRight,
} satisfies Record<string, IconNode>;

export type IconName = keyof typeof GLYPHS;

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
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...a11y}
    >
      {GLYPHS[name].map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

/** Joins the truthy class names, as the bundle's `cx` does. */
export function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(" ");
}
