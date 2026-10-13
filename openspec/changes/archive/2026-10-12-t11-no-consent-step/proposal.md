## Why

Between a passing photo and the quiz, the flow stops on a full screen, "Before we upload", with three cards and two buttons. It is the one step that asks the person to read before they get anywhere, and it comes right after the step they are most excited about. Visitors arrive on phones from TikTok and Instagram, and every extra tap before the result costs some of them. The web MVP launches 2026-10-26 (T11), so the cut has to land before then.

The screen does two jobs. It tells the person what leaves the phone, and `/privacy` names it as the legal basis for using the face crop ("because you agree to it on the consent screen"). Dropping the screen means moving both jobs elsewhere, not just deleting the step.

## What Changes

- **BREAKING (flow):** the consent step is gone. A photo that passes the check goes straight to the quiz, or straight to the analysis when the quiz is already done. "Agree and upload" and "Not now, go back" disappear, and so do the `consent` step, the `agree` / `decline` events and the `consented` flag in the step machine.
- **The disclosure moves onto the photo guide.** Under "Take a selfie" and "Upload a photo", a short notice says: only a crop of the face is sent, and only once the quiz is finished; an AI model from Google, through Vercel, reads its colors and does not train on it; it is deleted within 24 hours; a link to `/privacy`. The person reads it before they choose a photo, not after. The exact words are a canvas line the user approves.
- **The promise changes from "nothing leaves before consent" to "nothing leaves before the quiz is finished".** This is already how the code works: the crop and traits go out only with the analyze request, after the last question. The person can still leave at any point before that, and nothing is sent.
- **`/privacy`:** the basis for using the face crop becomes "it is needed to give you the analysis you asked for", the same basis the page already gives for the rest of the data. The sentence about withdrawing consent becomes "you can have it deleted at any time". "Last updated" changes.
- **`/terms`:** "Your photo" adds that taking or uploading a photo sends a face crop for the analysis, as the privacy policy describes. "Last updated" changes.
- **`/how-it-works`:** "only after you agree" (FAQ) and "Nothing is uploaded until the photo passes the check and you agree" (the privacy section) become "after the photo passes the check and you finish the quiz".
- **Analytics:** `consent_answered` is no longer sent. The PostHog funnel "Landing to share" loses its optional Consent step; this is edited by hand through the PostHog connector.
- **Folded in: BL-20.** The consent screen part is moot. The report email's footer line "We keep only your result" undersells what the report keeps. It becomes a line that names the report, and BL-20 is deleted from `docs/backlog.md`.
- **Not in scope:**
  - BL-19 (PostHog cookie without consent). It is a cookie question, not the photo, and stays deferred.
  - A "skip the photo" choice on the guide. Quiz-only stays as it is: offered after two failed checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `capture-flow`: removes the consent step. A passing photo goes to the quiz. The guide carries the upload notice. "Nothing leaves the device before consent" becomes "nothing leaves the device before the quiz is finished".
- `analytics`: drops `consent_answered` from the funnel events and from the saved funnel.
- `legal-pages`: the privacy policy states the analysis, not a consent screen, as the basis for using the crop. The terms say a photo sends a face crop.
- `site-content`: `/how-it-works` describes when the crop is sent without mentioning an agreement step. `/sample-report`'s list of events it must not send loses `consent_answered`.
- `email-capture`: the photo report email's footer names what is kept (BL-20).

## Impact

- **Code:**
  - `apps/web/src/app/(flow)/analyze/flow-state.ts`, `flow.tsx`: remove the step, the events and the flag.
  - `_capture/steps.tsx`: delete `Consent` and add the notice to `Guide`.
  - `(site)/privacy/page.tsx`, `(site)/terms/page.tsx`, `(site)/how-it-works/page.tsx`: copy.
  - `lib/email/render.ts`: the footer line.
- **Tests that change (each needs the user's approval):**
  - `_capture/consent.test.tsx` is replaced by a guide notice test.
  - The consent cases in `flow-state.test.ts`.
  - The "Agree and upload" clicks and the "Before we upload" heading in `e2e/analysis-flow.spec.ts`, `e2e/funnel.spec.ts` and `e2e/report-delivery.spec.ts`.
  - The event lists in `e2e/funnel.spec.ts` and `e2e/sample-report.spec.ts`.
  - The email footer test, if it pins the line.
- **Design:** canvas board 05 Consent is retired. Board 02 Guide gains the notice line. Board 12 (email) gets the new footer line. All need the user's approval before code.
- **PostHog:** the "Landing to share" insight is edited by hand.
- **Legal:** a change of basis for the face crop. See design.md. The user reviews the new privacy and terms text, as in `t8-photo-privacy`.
