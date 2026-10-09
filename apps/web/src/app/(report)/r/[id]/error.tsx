"use client";

import { Button } from "@/components/ds";
import { Wordmark } from "@/components/site-chrome";

/**
 * Board 10c: the report could not be read. readReport has already reported to Sentry.
 *
 * {@link openspec/specs/report-page/spec.md#requirement-a-failed-read-is-an-error-reported-to-sentry}
 */
export default function ReportError() {
  return (
    <div className="sn-screen flex flex-col gap-(--space-6)">
      <header className="flex min-h-(--size-tap) items-center">
        <Wordmark size="text-[1.4em]" />
      </header>
      <main className="flex flex-col gap-(--space-6)">
        <div className="flex flex-col gap-(--space-3) pt-(--space-8)">
          <h1 className="h1">We couldn&apos;t open your report</h1>
          <p className="lead text-(--ink-muted)">
            Your report is safe. Reload the page in a moment.
          </p>
        </div>
        <div className="sn-stack">
          <Button block onClick={() => location.reload()}>
            Reload
          </Button>
        </div>
      </main>
    </div>
  );
}
