## 1. Design, copy and approvals (user gates, before any code)

- [x] 1.1 Edit the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) in place, with the user's yes. Read it bare first, as `mvp-design-canvas` notes.
  - **02 Guide:** under "Take a selfie" and "Upload a photo", add a caption-size notice with a lock icon. Draft: "Only a crop of your face is sent, once you finish the quiz. An AI model from Google, through Vercel, reads its colors and doesn't train on it. We delete it within 24 hours. Privacy policy" ("Privacy policy" links to `/privacy`).
  - **05 Consent:** mark it retired ("removed in t11-no-consent-step") or delete it, and rewire the Play list so 04 → 06 Quiz.
  - **12 Email:** change the footer line to the draft "Your photo is deleted within 24 hours of your analysis. We keep your report until you ask us to delete it."

  Done when the user approves the boards in chat. Record the date and the canvas version here and in the `mvp-design-canvas` memory. If the user changes a word, update the `capture-flow` and `email-capture` deltas before section 3 cites them.

  Approved as drafted 2026-10-12; canvas version 39 (1791830846-0146). 05 Consent deleted; 03 Capture's actions now go to 06 Quiz.

- [x] 1.2 Show the user the new legal and site copy and get a yes in chat. Record the date here.
  - `/privacy` "Your rights", replacing "We use your face crop because you agree to it on the consent screen, … You can withdraw your consent at any time by asking us to delete your data." Draft: "We use your face crop and the rest of your data because we need them to give you the analysis and the report you asked for. You can have them deleted at any time, as above."
  - `/terms` "Your photo", added sentence. Draft: "When you take or upload a photo, a crop of your face is sent for the analysis, as our privacy policy describes."
  - `/how-it-works`:
    - FAQ "What happens to my photo?" draft: "Only a crop of your face is uploaded, after the photo passes the check and you finish the quiz. It is deleted within 24 hours. We keep your report, not your photo."
    - The "Only a crop of your face is uploaded" note draft: "The background and the rest of the photo stay on your phone. Nothing is uploaded until the photo passes the check and you finish the quiz."
  - Both legal pages get the shipping date as "Last updated".

  Approved as drafted 2026-10-12.

- [x] 1.3 Ask the user to approve the edits to existing tests listed in 2.x, in one message that names each file and what changes. Record the yes here. Approved 2026-10-12.

## 2. Tests (cite the new anchors; each existing-test edit needs 1.3)

- [x] 2.1 `apps/web/src/app/(flow)/analyze/_capture/consent.test.tsx`: delete it. Add `guide.test.tsx` cases, citing `capture-flow#scenario-the-guide-names-who-reads-the-crop`. They check that the rendered `Guide` holds the approved notice and `href="/privacy"`. Verify: the new case fails before 4.2.
- [x] 2.2 `flow-state.test.ts`, every case that names consent:
  - "Back from consent skips" the check becomes "Back from the quiz skips it".
  - The `describe("consent")` block becomes a pass going straight to `quiz` 0. Cite `#scenario-a-good-photo` and `#requirement-nothing-leaves-the-device-before-the-quiz-is-finished`.
  - Add a case for a pass with `quizDone` going straight to `analyzing`, with the crop in `request` (`#scenario-a-good-retake-after-the-quiz`).
  - Remove "asks for consent again after it was declined", "replaces consent with capture when declined" and "shows capture, not an empty consent".
  - "sends no photo left unanswered on consent by Back" becomes "Back from the quiz to the guide sends nothing" (`#scenario-leaving-during-the-quiz`).
  - The `stepProgress` case drops the word "consent".
  - Fix the helper comment "pass → consent → quiz".

  Verify: `pnpm --filter web test:unit flow-state` fails only on the cases 4.1 fixes.

- [x] 2.3 `apps/web/src/lib/email/render.test.ts`: the two footer assertions take the approved line. Add `not.toContain("We keep only your result")` and cite `email-capture#scenario-the-photo-footer`.
- [x] 2.4 Legal and site page tests:
  - `(site)/legal-pages.test.tsx`: add `legal-pages#scenario-the-basis-for-using-the-crop`, which checks `/privacy` has no "consent screen". Extend `#scenario-reading-the-terms` with the face-crop sentence.
  - `apps/web/src/lib/site-content/content.test.tsx` (it already renders `/how-it-works`): add `site-content#scenario-when-the-crop-is-uploaded`, which checks the page holds no "you agree".
- [x] 2.5 E2E, with the user's approval from 1.3:
  - `e2e/analysis-flow.spec.ts`: drop the two "Agree and upload" clicks. In the reload test, the Back after `Question 1 of 4` lands on the guide, so remove the "Before we upload" assertion and one `goBack`. Cite `capture-flow#scenario-a-good-photo`.
  - `e2e/funnel.spec.ts`:
    - Drop `consent_answered` from the event list at the top and from both expected sequences, and drop every "Agree and upload" click.
    - The "declined consent" test loses its decline half. It becomes "a second report_requested after Back, and no refused address", citing `analytics#scenario-from-landing-to-the-report` for the absence of `consent_answered`.
  - `e2e/report-delivery.spec.ts`: drop the "Agree and upload" click.
  - `e2e/sample-report.spec.ts`: drop `consent_answered` from the forbidden list.

  Verify: `pnpm --filter web e2e` fails only where section 4 has not landed.

## 3. Spec citation sweep

- [x] 3.1 Move `#requirement-the-flows-new-events-carry-only-their-outcome` to `#requirement-the-flows-events-carry-only-their-outcome` in `flow.tsx` and `e2e/funnel.spec.ts`. Then `grep -rn "nothing-leaves-the-device-before-consent\|scenario-consent-\|consent-step-names\|scenario-declining-consent\|flows-new-events" apps e2e packages scripts` returns nothing. `pnpm test:unit` passes the citation gate.

## 4. Code

- [x] 4.1 `apps/web/src/app/(flow)/analyze/flow-state.ts`:
  - Remove the `consent` step, the `agree` and `decline` events, `consented`, and both consent branches in `back`.
  - `checked` on a pass becomes `afterPhoto({ ...next, quizOnly: false }, replace)`.
  - `analyze` sends `s.photo`.
  - Update the doc comments ("what is sent after consent").

  Verify: 2.2 is green.

- [x] 4.2 `_capture/steps.tsx`: delete `Consent` and add the approved notice under the `Guide` actions: a `caption` with a lock `Icon` and a `Link` to `/privacy`. Use the DS's existing pieces, with no new component. Update the file's doc comment, which lists "and consent". Verify: 2.1 is green.
- [x] 4.3 `flow.tsx`: remove the `Consent` import, its render block and both `consent_answered` `track` calls. Verify with `pnpm typecheck`.
- [x] 4.4 `(site)/privacy/page.tsx`, `(site)/terms/page.tsx`, `(site)/how-it-works/page.tsx`: the copy approved in 1.2, and both "Last updated" dates. Verify: 2.4 is green.
- [x] 4.5 `apps/web/src/lib/email/render.ts`: the footer line approved in 1.1. Verify: 2.3 is green.
- [x] 4.6 Run the dev server through `preview_start` and check `/analyze` at 375 px: upload a passing face, and confirm the quiz's first question follows with no request to `/api/analyze` until the last answer (`read_network_requests`). Take a screenshot of the guide notice. Done 2026-10-12: the notice shows under the two actions; a passing face went straight to Question 1 with no `/api/` request. The run stopped before the last answer, so the local keys spent nothing.

## 5. PostHog and housekeeping

- [x] 5.1 Edit the "Landing to share" funnel through the PostHog connector: remove the optional Consent step. Record the insight link and the date here. Verify: the insight's steps read Landing, Flow start, Photo checked, Quiz done, Result, Report asked for, Email given, Report opened, Shared or saved. Done 2026-10-12: https://eu.posthog.com/project/290879/insights/u9u1pu2U (9 steps, description notes the change).
- [x] 5.2 Delete BL-20 from `docs/backlog.md`. Log any review finding left unfixed as a new `BL-nn`. Done 2026-10-12: BL-20 deleted; added BL-42 (citation gate and REMOVED deltas), BL-43 (guide notice and Google's 90 days), BL-44 ("We keep your result" on three site pages).
- [x] 5.3 `pnpm fix`, then `pnpm test`, then `pnpm --filter web e2e`, all green. Done 2026-10-12 after archive: unit 782/782; E2E on a production build (`CI=1`) 56/57, the one failure being BL-31 (macOS case-insensitive disk, also on `main`).

## 6. Review, archive, ship

- [x] 6.1 Run the phase review (`/code-review high`) in a fresh `general-purpose` subagent. Fix its findings and log the rest (5.2).
- [x] 6.2 Run `/opsx:archive`, then edit the permanent specs by hand, since a delta does not reach these sections:
  - `capture-flow`: the Purpose ("until the person agrees on the consent step" becomes "until the quiz is finished"), the `Step` union in Public Interface (drop `consent`), and the Behavior bullet "Leaving an unanswered consent by Back …" (remove it).
  - `analytics`: the `consent_answered` row in Public Interface.
  - `legal-pages`: the Edge Case that cites BL-20 (remove it), and the Behavior line on approval dates.
  - `site-structure`: the list of flow steps rendered inside `/analyze` (line 67) drops "consent" (found by the phase review).
- [x] 6.3 Update the Tracker: a T11 note that the consent step is removed and the funnel changed on <date>. Push, open a PR to `main` that names the BL ids added and removed, and turn on auto-merge with a merge commit.
