import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/color-analysis-gpt-alternative");

// Stub until its content ships: noindex and out of the sitemap while the route is not ready.
export default function Page() {
  return (
    <section className="flex flex-col gap-(--space-4)">
      <p className="overline">Color analysis GPT alternative</p>
      <h1 className="h1">The color analysis GPT is retiring. Your colors don&apos;t have to.</h1>
      <p className="lead text-(--ink-muted)">
        Seasonly finds your season from one selfie and four questions, with a photo check, a draping
        preview and a palette with hex codes.
      </p>
    </section>
  );
}
