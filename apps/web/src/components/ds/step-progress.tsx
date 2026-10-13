import type { CSSProperties } from "react";

import { cx, Icon } from "./icon";

export interface StepProgressProps {
  /** Index of the current step. */
  current?: number;
  steps?: readonly string[];
  /** A sub-step of the current step, 0-based: adds "· Question n of k" and fills the bar by its share. */
  sub?: { index: number; count: number };
  className?: string;
}

const STEPS = ["Photo", "Quiz", "Result"] as const;

/**
 * "Step n of 3" in text; finished steps carry a check and a hidden "(done)", so progress is never
 * told by color alone. With a sub-step, the current bar fills by its share. Ported from the design
 * system's bundle.js.
 *
 * @see openspec/specs/ui-components/spec.md
 */
export function StepProgress({ current = 0, steps = STEPS, sub, className }: StepProgressProps) {
  const count = `Step ${current + 1} of ${steps.length}`;
  return (
    <nav className={cx("sn-steps", className)} aria-label="Progress">
      <p className="sn-steps__count overline">
        {sub ? `${count} · Question ${sub.index + 1} of ${sub.count}` : count}
      </p>
      <ol>
        {steps.map((step, i) => {
          const state = i < current ? "done" : i === current ? "current" : "next";
          return (
            <li
              key={step}
              className={`sn-steps__step sn-steps__step--${state}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span
                className="sn-steps__bar"
                aria-hidden="true"
                style={
                  state === "current" && sub
                    ? ({
                        "--sn-steps-fill": `${((sub.index + 1) / sub.count) * 100}%`,
                      } as CSSProperties)
                    : undefined
                }
              />
              <span className="sn-steps__label">
                {state === "done" && <Icon name="check" size={14} />}
                {step}
                {state === "done" && <span className="sn-visually-hidden"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
