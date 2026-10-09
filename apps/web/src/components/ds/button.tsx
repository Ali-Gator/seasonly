import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

import { cx } from "./icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  /** Full column width. */
  block?: boolean;
  /** Renders a link instead of a <button>. */
  href?: string;
}

/**
 * Ported from the design system's bundle.js; a destination renders `next/link` for client navigation.
 * Unlike the bundle, a disabled destination renders no href.
 *
 * @see openspec/specs/ui-components/spec.md
 */
export function Button({
  variant = "primary",
  block,
  className,
  children,
  href,
  ...rest
}: ButtonProps) {
  const classes = cx("sn-btn", `sn-btn--${variant}`, block && "sn-btn--block", className);
  // A disabled destination is a link that goes nowhere: no href, so no tap or keyboard navigates.
  const { disabled, ...anchor } = rest;
  if (href && (disabled || String(rest["aria-disabled"]) === "true"))
    return (
      <a
        role="link"
        {...(anchor as AnchorHTMLAttributes<HTMLAnchorElement>)}
        aria-disabled="true"
        className={classes}
      >
        {children}
      </a>
    );
  if (href)
    return (
      // Every prop passes through, as in the bundle; the handlers' element type is the only mismatch.
      <Link href={href} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={classes}>
        {children}
      </Link>
    );
  return (
    <button type="button" {...rest} className={classes}>
      {children}
    </button>
  );
}
