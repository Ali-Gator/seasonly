import Link from "next/link";

import { SiteShell } from "@/components/site-chrome";

// Next adds noindex to every 404 response.
export default function NotFound() {
  return (
    <SiteShell>
      <section className="flex flex-col gap-(--space-4) pt-(--space-8)">
        <p className="overline">Page not found</p>
        <h1 className="h1">This page doesn&apos;t exist</h1>
        <p className="lead text-(--ink-muted)">The link may be old, or the address mistyped.</p>
        <div className="mt-(--space-4) flex flex-col gap-(--space-3)">
          <Link href="/" className="sn-btn sn-btn--primary sn-btn--block">
            Go to the home page
          </Link>
          <Link href="/seasons" className="sn-btn sn-btn--secondary sn-btn--block">
            Browse the 12 seasons
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
