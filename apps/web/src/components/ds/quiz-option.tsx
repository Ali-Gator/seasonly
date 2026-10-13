import type { InputHTMLAttributes } from "react";

import { cx } from "./icon";
import { Slot } from "./slot";

export interface QuizOptionProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
  /** An example photo's source; with none, no image slot. */
  image?: string;
  imageAlt?: string;
}

/**
 * A native radio inside its label, with an example photo when given one; every other prop passes
 * through to the input. Ported from the design system's bundle.js (`image`, `imageAlt`).
 *
 * {@link openspec/specs/ui-components/spec.md#requirement-a-quiz-option-is-a-native-radio-inside-its-label}
 */
export function QuizOption({
  label,
  description,
  image,
  imageAlt,
  className,
  ...input
}: QuizOptionProps) {
  return (
    <label className={cx("sn-quiz", image && "sn-quiz--image", className)}>
      <input type="radio" className="sn-quiz__input" {...input} />
      {image && <Slot src={image} alt={imageAlt} className="sn-quiz__slot" />}
      <span className="sn-quiz__text">
        <span className="sn-quiz__label">{label}</span>
        {description && <span className="sn-quiz__desc">{description}</span>}
      </span>
      <span className="sn-quiz__mark" aria-hidden="true" />
    </label>
  );
}
