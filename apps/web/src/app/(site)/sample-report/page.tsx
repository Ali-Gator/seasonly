import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/sample-report");

// Stub until its content ships: noindex and out of the sitemap while the route is not ready.
export default function Page() {
  return (
    <section className="flex flex-col gap-(--space-4)">
      <p className="overline">Sample report</p>
      <h1 className="display">Soft Autumn</h1>
      <p className="lead text-(--ink-muted)">
        This is a sample Soft Autumn report. Yours is built from your own selfie and four questions.
      </p>
    </section>
  );
}
