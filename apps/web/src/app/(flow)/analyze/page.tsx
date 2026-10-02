import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/analyze");

// Stub until t5-analysis-flow: every step will render here without changing the URL.
export default function Analyze() {
  return (
    <main className="flex flex-col gap-(--space-3)">
      <h1 className="h1">Three things before your selfie</h1>
      <p className="lead text-(--ink-muted)">
        Face a window, skip the makeup and the filter. Daylight shows your real undertone.
      </p>
    </main>
  );
}
