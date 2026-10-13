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
  /** One example, or a list: the good reference on the left, the bad ones stacked small on the right. */
  bad: TipExample | readonly TipExample[];
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
 * One photo tip with a good and a bad example, or one good reference and several to avoid, each
 * verdict in words and an icon. Ported from the design system's bundle.js; an example without an
 * image shows a labeled placeholder.
 *
 * {@link openspec/specs/ui-components/spec.md#requirement-a-photo-tip-card-tells-good-from-bad-in-words}
 */
export function PhotoTipCard({ title, body, good, bad, className }: PhotoTipCardProps) {
  return (
    <section className={cx("sn-card sn-tip", className)}>
      <h3 className="h3">{title}</h3>
      {body && <p className="sn-tip__body">{body}</p>}
      <div className="sn-tip__pair">
        <Example kind="good" {...good} />
        {"caption" in bad ? (
          <Example kind="bad" {...bad} />
        ) : (
          <div className="sn-tip__avoid">
            {bad.map((b) => (
              <Example key={b.caption} kind="bad" {...b} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
