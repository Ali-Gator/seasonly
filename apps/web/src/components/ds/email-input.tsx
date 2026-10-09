import { type InputHTMLAttributes, useId } from "react";

import { cx, Icon } from "./icon";

export interface EmailInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  hint?: string;
  /** Shown after a failed submit, in place of the hint. */
  error?: string;
}

/**
 * The report step's email field: a visible label, the email keyboard and autofill, and a hint or
 * an error tied to the input. Ported from the design system's bundle.js.
 *
 * {@link openspec/specs/ui-components/spec.md#requirement-an-email-input-is-labeled-and-states-its-error-in-words}
 */
export function EmailInput({ label, hint, error, id, className, ...rest }: EmailInputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const noteId = `${inputId}-note`;
  const note = error || hint;
  return (
    <div className={cx("sn-field", error && "sn-field--error", className)}>
      <label className="sn-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        className="sn-field__input"
        placeholder="you@example.com"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={note ? noteId : undefined}
        {...rest}
      />
      {note && (
        <p id={noteId} className={error ? "sn-field__error" : "sn-field__hint"}>
          {error ? (
            <>
              <Icon name="cross" size={14} />
              <span>
                <span className="sn-visually-hidden">Error: </span>
                {error}
              </span>
            </>
          ) : (
            hint
          )}
        </p>
      )}
    </div>
  );
}
