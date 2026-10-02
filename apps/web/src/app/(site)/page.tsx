import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/");

// Stub until its content ships: noindex and out of the sitemap while the route is not ready.
export default function Page() {
  return (
    <section className="flex flex-col gap-(--space-4)">
      <p className="overline">Seasonal color analysis</p>
      <h1 className="h1">Find your colors from one selfie.</h1>
      <p className="lead text-(--ink-muted)">
        One daylight selfie and four quick questions. In under a minute you get your season and 30
        colors that work with you.
      </p>
    </section>
  );
}
