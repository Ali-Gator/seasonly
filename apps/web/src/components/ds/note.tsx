import type { ReactNode } from "react";

import { cx, Icon, type IconName } from "./icon";

export interface NoteProps {
  tone?: "neutral" | "danger" | "success";
  title?: string;
  icon?: IconName;
  children?: ReactNode;
  className?: string;
}

const TONE_ICON = { neutral: "info", danger: "cross", success: "check" } as const;

/**
 * A verdict or reassurance block: tone color always comes with an icon and words. Ported from the
 * design system's bundle.js.
 *
 * @see openspec/specs/ui-components/spec.md
 */
export function Note({ tone = "neutral", title, icon, children, className }: NoteProps) {
  return (
    <div className={cx("sn-note", `sn-note--${tone}`, className)}>
      <Icon name={icon ?? TONE_ICON[tone]} size={18} className="sn-note__icon" />
      <div className="sn-note__text">
        {title && <p className="sn-note__title">{title}</p>}
        {children && <div className="sn-note__body">{children}</div>}
      </div>
    </div>
  );
}
