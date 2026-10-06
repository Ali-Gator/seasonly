import type { InputHTMLAttributes } from "react";

import { cx } from "./icon";

export interface QuizOptionProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

/**
 * A native radio inside its label; every other prop passes through to the input. Ported from the
 * design system's bundle.js, without the image slot the quiz does not use.
 *
 * @see openspec/specs/ui-components/spec.md
 */
export function QuizOption({ label, description, className, ...input }: QuizOptionProps) {
  return (
    <label className={cx("sn-quiz", className)}>
      <input type="radio" className="sn-quiz__input" {...input} />
      <span className="sn-quiz__text">
        <span className="sn-quiz__label">{label}</span>
        {description && <span className="sn-quiz__desc">{description}</span>}
      </span>
      <span className="sn-quiz__mark" aria-hidden="true" />
    </label>
  );
}
