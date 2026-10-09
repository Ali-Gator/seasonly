"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type Ref, useRef, useState } from "react";

import { Button, EmailInput, Icon, Note } from "@/components/ds";
import { track } from "@/lib/analytics";
import { EMAIL_ERROR, parseEmail } from "@/lib/email/address";
import { postWithin } from "@/lib/http/post-within";

/**
 * The email step of canvas artboards 09 and 09b, inside /analyze: the address is the only way to
 * the report.
 *
 * @see openspec/specs/email-capture/spec.md
 */
export type Submitted = { kind: "invalid" } | { kind: "open"; href: string } | { kind: "failed" };

/**
 * Checks the address on the device, then stores it. A 429 opens the report too: the report has
 * its 3 addresses, and the report is the person's own.
 *
 * {@link openspec/specs/email-capture/spec.md#requirement-sending-the-form-stores-the-address-and-opens-the-report}
 */
export async function submitEmail(
  reportId: string,
  raw: string,
  { fetch = globalThis.fetch }: { fetch?: typeof globalThis.fetch } = {},
): Promise<Submitted> {
  const email = parseEmail(raw);
  if (!email) return { kind: "invalid" };
  const res = await postWithin(
    `/api/reports/${reportId}/email`,
    { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) },
    { fetch },
  );
  return res && (res.ok || res.status === 429)
    ? { kind: "open", href: `/r/${reportId}` }
    : { kind: "failed" };
}

const INSIDE = [
  "Your 12-season subtype",
  "30 colors with names and hex codes",
  "Colors to avoid",
  "Best neutrals and metals",
  "Makeup and hair ideas",
];
const DRAPING = "Your best and worst color, side by side";

/** {@link openspec/specs/email-capture/spec.md#requirement-the-email-step-follows-the-canvas} */
export function EmailForm({
  family,
  quizOnly,
  value,
  error,
  sending,
  failed,
  onChange,
  onSubmit,
  inputRef,
}: {
  family: string;
  quizOnly: boolean;
  value: string;
  error: string | null;
  sending: boolean;
  failed: boolean;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <>
      <div className="flex flex-col gap-(--space-3)">
        <p className="overline">{family} · your full report</p>
        <h1 className="h1" tabIndex={-1}>
          Get your full report
        </h1>
        <p className="lead text-(--ink-muted)">Free for now, while we are in early access.</p>
      </div>
      <section className="sn-card flex flex-col gap-(--space-3)">
        <h2 className="h3">What&apos;s inside</h2>
        <ul className="flex flex-col gap-(--space-2)">
          {(quizOnly ? INSIDE : [...INSIDE, DRAPING]).map((item) => (
            <li key={item} className="flex items-center gap-(--space-2)">
              <Icon name="check" size={18} />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <form className="flex flex-col gap-(--space-4)" onSubmit={onSubmit} noValidate>
        <EmailInput
          label="Where should we send your report?"
          hint="We'll email you one link to your report. No newsletter unless you ask."
          error={error ?? undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          ref={inputRef}
        />
        {/* Announced: focus stays on the button, so a screen reader hears nothing else. */}
        <div role="alert">
          {failed && (
            <Note tone="danger" title="We couldn't send your report">
              Nothing is lost, so you can try again.
            </Note>
          )}
        </div>
        {/* aria-disabled, not disabled: a disabled button drops focus to the page. */}
        <Button type="submit" block aria-disabled={sending ? "true" : undefined}>
          <Icon name="mail" size={18} />
          Send my report
        </Button>
      </form>
      <p className="caption text-center text-(--ink-muted)">
        Your report also opens on the next screen, so you can read it now.
      </p>
    </>
  );
}

export function EmailStep({
  reportId,
  family,
  quizOnly,
}: {
  reportId: string;
  family: string;
  quizOnly: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // A second tap while sending sends nothing more.
    if (sending) return;
    setFailed(false);
    if (!parseEmail(value)) {
      setError(EMAIL_ERROR);
      // The error is read with the field once focus is on it.
      return input.current?.focus();
    }
    setError(null);
    setSending(true);
    const result = await submitEmail(reportId, value);
    if (result.kind === "open") {
      // Never the address, nor any part of it.
      // {@link openspec/specs/analytics/spec.md#requirement-the-email-event-never-carries-the-address}
      track("email_submitted", {});
      // Stays disabled while the report opens.
      return router.push(result.href);
    }
    setSending(false);
    if (result.kind === "invalid") {
      setError(EMAIL_ERROR);
      input.current?.focus();
    } else setFailed(true);
  };

  return (
    <EmailForm
      family={family}
      quizOnly={quizOnly}
      value={value}
      error={error}
      sending={sending}
      failed={failed}
      onChange={setValue}
      onSubmit={onSubmit}
      inputRef={input}
    />
  );
}
