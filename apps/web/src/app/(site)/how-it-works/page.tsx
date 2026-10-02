import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/how-it-works");

// Stub until its content ships: noindex and out of the sitemap while the route is not ready.
export default function Page() {
  return (
    <section className="flex flex-col gap-(--space-4)">
      <p className="overline">How it works</p>
      <h1 className="h1">How Seasonly finds your colors</h1>
      <p className="lead text-(--ink-muted)">
        One daylight selfie and four quick questions. Here is what happens to each, and why.
      </p>
    </section>
  );
}
