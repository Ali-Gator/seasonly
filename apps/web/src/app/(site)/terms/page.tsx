import Link from "next/link";
import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/terms");

const SECTIONS: [heading: string, body: ReactNode][] = [
  [
    "What Seasonly is",
    "Seasonly estimates your seasonal color type from one selfie and four questions, and suggests colors to wear. A result is an estimate for choosing colors. It is not professional, medical or any other advice. Light, camera and makeup change a photo, so a result can be wrong.",
  ],
  ["Who can use it", "You must be 16 or older to use Seasonly."],
  [
    "Your photo",
    <>
      Upload only a photo of yourself. Do not upload a photo of anyone else. Our{" "}
      <Link href="/privacy">privacy policy</Link> says what happens to your photo and your data.
    </>,
  ],
  [
    "Fair use",
    "Do not use Seasonly through scripts or bots, try to get around its limits, or try to open other people's reports.",
  ],
  [
    "No warranty",
    "Seasonly is free and provided as is, with no warranty of any kind. We do not promise that it is accurate, always available or free of errors.",
  ],
  [
    "Limits of liability",
    "As far as the law allows, we are not liable for any loss that comes from using Seasonly or relying on a result. Nothing in these terms limits a liability that the law does not let us limit.",
  ],
  [
    "Changes to these terms",
    "We may change these terms. We post the new version on this page with a new date. Using Seasonly after that means you accept the new version.",
  ],
  [
    "Law and contact",
    <>
      The law of Bulgaria governs these terms. If you live in the EU, you also keep the protection
      of your own country&apos;s consumer law. Questions go to{" "}
      <a href="mailto:privacy@seasonly.me">privacy@seasonly.me</a>.
    </>,
  ],
];

/**
 * The terms of use, in the layout of the canvas board "20 Legal page".
 *
 * {@link openspec/specs/legal-pages/spec.md#requirement-the-terms-state-what-the-service-is-and-its-limits}
 */
export default function Page() {
  return (
    <article className="flex max-w-[720px] flex-col gap-(--space-8)">
      <div className="flex flex-col gap-(--space-3) border-b border-(--line) pb-(--space-6)">
        <p className="overline">Legal</p>
        <h1 className="h1">Terms of use</h1>
        <p className="caption text-(--ink-muted)">Last updated October 10, 2026</p>
        <p className="lead">By using Seasonly you agree to these terms. They are short.</p>
      </div>
      {SECTIONS.map(([heading, body]) => (
        <section key={heading} className="flex flex-col gap-(--space-3)">
          <h2 className="h2">{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
    </article>
  );
}
