"use client";

import { useState } from "react";

import { Button, Icon, Note } from "@/components/ds";

/**
 * The Premium card of canvas artboard "10 Premium button", with its clicked and failed states.
 *
 * @see openspec/specs/interest-button/spec.md
 */
const TIMEOUT_MS = 10_000;

export type Tapped = { kind: "clicked"; email: string | null } | { kind: "failed" };

/** {@link openspec/specs/interest-button/spec.md#requirement-a-tap-records-one-interest-per-report} */
export async function tapPremium(
  reportId: string,
  { fetch = globalThis.fetch }: { fetch?: typeof globalThis.fetch } = {},
): Promise<Tapped> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`/api/reports/${reportId}/interest`, {
      method: "POST",
      signal: controller.signal,
    });
    if (!res.ok) return { kind: "failed" };
    const body = (await res.json()) as { email?: unknown };
    return { kind: "clicked", email: typeof body.email === "string" ? body.email : null };
  } catch {
    return { kind: "failed" };
  } finally {
    clearTimeout(timer);
  }
}

export type Phase = "idle" | "sending" | "clicked" | "failed";

/**
 * {@link openspec/specs/interest-button/spec.md#requirement-the-premium-card-follows-the-canvas}
 * {@link openspec/specs/interest-button/spec.md#requirement-the-clicked-state-names-where-the-news-will-go}
 */
export function PremiumCardView({
  phase,
  email,
  onTap,
}: {
  phase: Phase;
  email: string | null;
  onTap: () => void;
}) {
  return (
    <section className="sn-card flex flex-col gap-(--space-3)">
      <p className="overline">Next</p>
      <h2 className="h3">A deeper report</h2>
      <p className="text-(--ink-muted)">
        A capsule wardrobe built from your palette, outfit formulas and a palette card for shopping.
      </p>
      {phase === "clicked" ? (
        <>
          <Button variant="secondary" block aria-disabled="true">
            <Icon name="check" size={18} />
            We&apos;ll let you know
          </Button>
          <Note icon="mail" title="Thanks for asking">
            Premium reports aren&apos;t out yet. We&apos;ll email {email ?? "you"} once, when they
            are. Nothing to pay now.
          </Note>
        </>
      ) : (
        <Button variant="secondary" block disabled={phase === "sending"} onClick={onTap}>
          Premium report – coming soon
        </Button>
      )}
      {phase === "failed" && (
        <p role="alert" className="caption flex items-start gap-(--space-1) text-(--danger)">
          <Icon name="cross" size={14} className="mt-0.5" />
          We couldn&apos;t save that. Please try again.
        </p>
      )}
    </section>
  );
}

export function PremiumCard({
  reportId,
  interested,
  email: storedEmail,
}: {
  reportId: string;
  interested: boolean;
  email: string | null;
}) {
  const [phase, setPhase] = useState<Phase>(interested ? "clicked" : "idle");
  const [email, setEmail] = useState(storedEmail);
  const onTap = async () => {
    if (phase === "sending") return;
    setPhase("sending");
    const tapped = await tapPremium(reportId);
    if (tapped.kind === "failed") return setPhase("failed");
    setEmail(tapped.email);
    setPhase("clicked");
  };
  return <PremiumCardView phase={phase} email={email} onTap={onTap} />;
}
