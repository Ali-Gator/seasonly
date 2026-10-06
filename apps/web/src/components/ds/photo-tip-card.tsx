import { cx, Icon } from "./icon";
import { Slot } from "./slot";

export interface TipExample {
  caption: string;
  src?: string;
  alt?: string;
}

export interface PhotoTipCardProps {
  title: string;
  body?: string;
  good: TipExample;
  bad: TipExample;
  className?: string;
}

function Example({ kind, caption, src, alt }: TipExample & { kind: "good" | "bad" }) {
  const good = kind === "good";
  return (
    <figure className="sn-tip__example">
      <Slot
        src={src}
        alt={alt}
        label={good ? "Good photo" : "Bad photo"}
        className="sn-tip__slot"
      />
      <figcaption>
        <span className={`sn-tip__verdict sn-tip__verdict--${kind}`}>
          <Icon name={good ? "check" : "cross"} size={14} />
          {good ? "Good" : "Avoid"}
        </span>
        <span className="sn-tip__caption">{caption}</span>
      </figcaption>
    </figure>
  );
}

/**
 * One photo tip with a good and a bad example, each verdict in words and an icon. Ported from the
 * design system's bundle.js; an example without an image shows a labeled placeholder.
 *
 * @see openspec/specs/ui-components/spec.md
 */
export function PhotoTipCard({ title, body, good, bad, className }: PhotoTipCardProps) {
  return (
    <section className={cx("sn-card sn-tip", className)}>
      <h3 className="h3">{title}</h3>
      {body && <p className="sn-tip__body">{body}</p>}
      <div className="sn-tip__pair">
        <Example kind="good" {...good} />
        <Example kind="bad" {...bad} />
      </div>
    </section>
  );
}
