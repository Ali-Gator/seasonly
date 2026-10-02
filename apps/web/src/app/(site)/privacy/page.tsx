import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/privacy");

// Stub until its content ships: noindex and out of the sitemap while the route is not ready.
export default function Page() {
  return (
    <section className="flex flex-col gap-(--space-4)">
      <p className="overline">Legal</p>
      <h1 className="h1">Privacy policy</h1>
      <p className="lead text-(--ink-muted)">Coming soon.</p>
    </section>
  );
}
