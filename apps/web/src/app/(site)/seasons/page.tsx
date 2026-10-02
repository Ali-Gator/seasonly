import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/seasons");

// Stub until its content ships: noindex and out of the sitemap while the route is not ready.
export default function Page() {
  return (
    <section className="flex flex-col gap-(--space-4)">
      <p className="overline">The 12 seasons</p>
      <h1 className="h1">Twelve seasons, four families</h1>
      <p className="lead text-(--ink-muted)">
        Seasonal color analysis sorts coloring into four families, then splits each family in three.
        Three questions decide where you land.
      </p>
    </section>
  );
}
