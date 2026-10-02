import { type ReactNode, useId } from "react";

import { cx } from "./icon";

export interface ReportSectionProps {
  title: string;
  overline?: string;
  intro?: string;
  id?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * A report region labeled by its own h2. Ported from the design system's bundle.js.
 *
 * @see openspec/specs/ui-components/spec.md
 */
export function ReportSection({
  title,
  overline,
  intro,
  id,
  children,
  className,
}: ReportSectionProps) {
  const autoId = useId();
  const headingId = id || autoId;
  return (
    <section className={cx("sn-report", className)} aria-labelledby={headingId}>
      {overline && <p className="overline sn-report__overline">{overline}</p>}
      <h2 className="h2" id={headingId}>
        {title}
      </h2>
      {intro && <p className="sn-report__intro">{intro}</p>}
      {children && <div className="sn-report__body">{children}</div>}
    </section>
  );
}
