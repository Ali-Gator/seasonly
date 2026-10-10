import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/privacy");

/** Every outside service that receives data from a visit: what it gets and how long it keeps it. */
const SERVICES: [service: string, gets: string, kept: string][] = [
  [
    "Vercel",
    "Hosts the site, so it sees every request and your IP address. Runs the bot check on the analysis and email steps, and measures page speed.",
    "request logs for 1 hour.",
  ],
  [
    "Supabase, EU",
    "Stores your report, your email addresses, the Premium note and, for up to 24 hours, your face crop.",
    "until we delete them.",
  ],
  [
    "Google, through Vercel AI Gateway",
    "Your face crop, your season, the measured traits and your quiz answers, to write your report text. A quiz-only analysis sends nothing. Google does not train on them.",
    "Vercel keeps nothing. Google may keep them up to 90 days, only to check for abuse.",
  ],
  [
    "Resend",
    "Your email address and the report email. It also records whether the email was opened and which links were clicked.",
    "30 days.",
  ],
  [
    "PostHog, EU",
    "Anonymous steps through the site, with report ids hidden and no email address. It sets one first-party cookie.",
    "up to 7 years.",
  ],
  [
    "Sentry, Germany",
    "Error reports with the page address and your browser, which can include a report id.",
    "30 days.",
  ],
  [
    "jsDelivr",
    "Your browser downloads the face-detection code from it, so it sees your IP address.",
    "aggregated within hours, then deleted.",
  ],
  [
    "Google Cloud Storage",
    "Your browser downloads the face-detection model from it, so it sees your IP address.",
    "under Google's privacy policy.",
  ],
  [
    "Google, face-detection log",
    "The face-detection code sends Google a usage log: which task ran and how long it took, never your photo. Google sees your IP address.",
    "under Google's privacy policy.",
  ],
];

/**
 * The privacy policy: what Seasonly stores and for how long, who else receives data, and how to
 * have it deleted. Copy approved with the canvas board "20 Legal page".
 *
 * {@link openspec/specs/legal-pages/spec.md#requirement-the-privacy-policy-names-what-is-stored-and-for-how-long}
 */
export default function Page() {
  return (
    <article className="flex max-w-[720px] flex-col gap-(--space-8)">
      <div className="flex flex-col gap-(--space-3) border-b border-(--line) pb-(--space-6)">
        <p className="overline">Legal</p>
        <h1 className="h1">Privacy policy</h1>
        <p className="caption text-(--ink-muted)">Last updated October 10, 2026</p>
        <p className="lead">
          Seasonly needs a crop of your face to find your colors. This page says what we keep, who
          else sees it, and how to have it deleted.
        </p>
      </div>

      <section className="flex flex-col gap-(--space-3)">
        <h2 className="h2">What we store and for how long</h2>
        <p>We store four things, and nothing else about you.</p>
        <ul className="flex list-disc flex-col gap-(--space-2) pl-(--space-5)">
          <li>
            A crop of your face. We use it to write your report and to show your colors against your
            face in the draping preview. We delete it within 24 hours of your analysis. The rest of
            your photo never leaves your phone.
          </li>
          <li>
            Your report: your season, the color traits we measured, your quiz answers and the text
            written for you. We keep it until you ask us to delete it.
          </li>
          <li>
            Up to 3 email addresses per report, if you ask us to send it. We use an address to send
            your report and, if you tapped Premium, one email when Premium launches. We keep them
            until you ask us to delete them.
          </li>
          <li>
            A note that you tapped Premium, if you did. We keep it until you ask us to delete it.
          </li>
        </ul>
        <p>If you skip the photo, we store only your report.</p>
      </section>

      <section className="flex flex-col gap-(--space-3)">
        <h2 className="h2">Your report link</h2>
        <p>Your report has no password. Its link is the only key to it.</p>
        <p>
          Anyone with the link can open your report, load your face crop while we still keep it, and
          see the email address shown after Premium is tapped. Share it only with people you would
          show your report to.
        </p>
      </section>

      <section className="flex flex-col gap-(--space-3)">
        <h2 className="h2">Who else receives data</h2>
        <p>
          These services run parts of Seasonly. Each gets only what it needs and keeps it as long as
          its own terms say. A deletion request reaches our own records, not their copies.
        </p>
        <dl>
          {SERVICES.map(([service, gets, kept]) => (
            <div
              key={service}
              className="grid gap-x-(--space-6) gap-y-(--space-1) border-t border-(--line) py-(--space-3) last:border-b sm:grid-cols-[240px_minmax(0,1fr)]"
            >
              <dt className="label">{service}</dt>
              <dd className="flex flex-col gap-(--space-1) text-(--ink-muted)">
                <span>{gets}</span>
                <span>Kept: {kept}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-(--space-3)">
        <h2 className="h2">Cookies</h2>
        <p>
          We set one cookie, from PostHog, to count anonymous steps through the site. It holds a
          random id, not your name or email address. You can block it in your browser, and Seasonly
          works the same.
        </p>
      </section>

      <section className="flex flex-col gap-(--space-3)">
        <h2 className="h2">What we never do</h2>
        <ul className="flex list-disc flex-col gap-(--space-2) pl-(--space-5)">
          <li>We never upload your whole photo, only the crop of your face.</li>
          <li>
            We never use your face to identify you. Your phone finds the points of your face, and
            they stay on your phone.
          </li>
          <li>Neither we nor Google use your photo to train AI models.</li>
          <li>We never sell your data.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-(--space-3)">
        <h2 className="h2">Your rights</h2>
        <p>
          You can ask for a copy of your data, ask us to correct it, or ask us to delete it. Send
          your report link, or the email address you used. We answer within 30 days.
        </p>
        <ul className="flex list-disc flex-col gap-(--space-2) pl-(--space-5)">
          <li>
            With your report link, we delete the report, its email addresses, the Premium note and
            the face crop. The link then stops working.
          </li>
          <li>
            With only an email address, we delete that address wherever it is stored. The reports
            stay, because an address alone does not show whose they are.
          </li>
        </ul>
        <p>
          We use your face crop because you agree to it on the consent screen, and the rest of your
          data to give you the report you asked for. You can withdraw your consent at any time by
          asking us to delete your data.
        </p>
        <p>
          You can also complain to a data protection authority: in Bulgaria, the Commission for
          Personal Data Protection (<a href="https://www.cpdp.bg">cpdp.bg</a>), or the one in your
          own EU country.
        </p>
      </section>

      <section className="flex flex-col gap-(--space-3)">
        <h2 className="h2">Who runs Seasonly</h2>
        <p>
          Seasonly is run by an individual in Bulgaria, not a company. Write to{" "}
          <a href="mailto:care@seasonly.me">care@seasonly.me</a> about your privacy or a deletion
          request.
        </p>
        <p>When this page changes, the date at the top changes too.</p>
      </section>
    </article>
  );
}
