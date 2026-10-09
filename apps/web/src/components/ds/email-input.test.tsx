import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmailInput } from "./index";

const html = (el: ReactElement) => renderToStaticMarkup(el);
const attr = (markup: string, tag: string, name: string) =>
  new RegExp(`<${tag}[^>]* ${name}="([^"]*)"`).exec(markup)?.[1];

describe("EmailInput", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-a-hint} */
  it("names the field by its label and describes it by the hint", () => {
    const out = html(
      <EmailInput
        id="email"
        label="Where should we send your report?"
        hint="We'll email you one link to your report."
      />,
    );
    expect(out).toContain(
      '<label class="sn-field__label" for="email">Where should we send your report?</label>',
    );
    expect(attr(out, "input", "id")).toBe("email");
    expect(attr(out, "input", "type")).toBe("email");
    expect(attr(out, "input", "autoComplete")).toBe("email");
    expect(attr(out, "input", "inputMode")).toBe("email");
    expect(attr(out, "input", "aria-describedby")).toBe("email-note");
    expect(out).toContain(
      '<p id="email-note" class="sn-field__hint">We&#x27;ll email you one link to your report.</p>',
    );
    expect(out).not.toContain("aria-invalid");
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-an-error} */
  it("marks the field invalid and reads the error with Error: first", () => {
    const out = html(
      <EmailInput label="Email" hint="Hint" error="Enter an email like you@example.com" />,
    );
    expect(out).toMatch(/^<div class="sn-field sn-field--error">/);
    expect(attr(out, "input", "aria-invalid")).toBe("true");
    const note = attr(out, "input", "aria-describedby");
    expect(out).toMatch(new RegExp(`<p id="${note}" class="sn-field__error"><svg[^>]*aria-hidden`));
    expect(out.replace(/<[^>]+>/g, "")).toContain("Error: Enter an email like you@example.com");
    expect(out).not.toContain("Hint");
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-an-email-input-is-labeled-and-states-its-error-in-words} */
  it("gives each field its own ids and passes input props through", () => {
    const out = html(
      <>
        <EmailInput label="A" hint="h" defaultValue="maya@example.com" />
        <EmailInput label="B" hint="h" />
      </>,
    );
    const ids = [...out.matchAll(/<input[^>]* id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
    expect(out).toContain('value="maya@example.com"');
  });
});
