import { seasonFamily } from "@seasonly/analysis";
import Link from "next/link";
import type { ReactNode } from "react";

import { SEASONS, seasonName } from "@/lib/site/routes";

// Site and flow chrome from the approved canvas (artboards 14 and 02–13) and the 404 (21).

const FAMILIES = ["spring", "summer", "autumn", "winter"] as const;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Wordmark({ size = "text-[1.6em] lg:text-[1.75em]" }: { size?: string }) {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center self-start no-underline">
      <span className={`sn-wordmark ${size}`}>Seasonly</span>
    </Link>
  );
}

function FooterGroup({
  id,
  title,
  links,
}: {
  id: string;
  title: string;
  links: [string, string][];
}) {
  return (
    <div className="flex flex-col gap-(--space-1)">
      <p className="overline" id={id}>
        {title}
      </p>
      <ul aria-labelledby={id}>
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="caption sn-navlink text-(--ink-muted)">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Page column, header, footer: the chrome every `(site)` page and the 404 share. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="sn-screen flex flex-col gap-(--space-12) lg:max-w-(--size-page) lg:gap-(--space-16) lg:px-(--space-6) lg:py-(--space-8)">
      <header className="grid grid-cols-[1fr_auto] items-center border-b border-(--line) pb-(--space-1) lg:grid-cols-[1fr_auto_auto] lg:gap-(--space-6) lg:border-b-0 lg:pb-0">
        <Wordmark />
        <nav
          aria-label="Main"
          className="col-span-2 row-start-2 flex gap-(--space-6) lg:col-span-1 lg:col-start-2 lg:row-start-1"
        >
          <Link href="/seasons" className="label sn-navlink">
            Seasons
          </Link>
          <Link href="/how-it-works" className="label sn-navlink">
            How it works
          </Link>
        </nav>
        <Link
          href="/analyze"
          className="sn-btn sn-btn--secondary col-start-2 row-start-1 lg:col-start-3"
        >
          Find my colors
        </Link>
      </header>

      <main className="flex flex-col gap-(--space-12)">{children}</main>

      <footer className="flex flex-col gap-(--space-8) border-t border-(--line) pt-(--space-8) pb-(--space-6) lg:grid lg:grid-cols-12 lg:gap-x-(--space-6) lg:pb-0">
        <div className="flex flex-col gap-(--space-2) lg:col-span-3">
          <Wordmark />
          <p className="caption hidden text-(--ink-muted) lg:block">
            Seasonal color analysis from one selfie.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-(--space-4) gap-y-(--space-6) lg:col-span-9 lg:grid-cols-5 lg:gap-x-(--space-6)"
        >
          {FAMILIES.map((family) => (
            <FooterGroup
              key={family}
              id={`ft-${family}`}
              title={capitalize(family)}
              links={SEASONS.filter((s) => seasonFamily(s.slug) === family).map((s) => [
                `/seasons/${s.slug}`,
                seasonName(s.slug),
              ])}
            />
          ))}
          <FooterGroup
            id="ft-more"
            title="More"
            links={[
              ["/color-analysis-gpt-alternative", "Color analysis GPT alternative"],
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
            ]}
          />
        </nav>
        <p className="caption text-(--ink-muted) lg:col-span-full lg:border-t lg:border-(--line) lg:pt-(--space-4) lg:pb-(--space-2)">
          seasonly.me
        </p>
      </footer>
    </div>
  );
}

/** The 404 message, inside whichever chrome the 404 renders in. */
export function NotFoundMessage() {
  return (
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
  );
}
