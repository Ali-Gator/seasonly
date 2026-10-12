## Context

The step machine in `flow-state.ts` routes a passing photo to `consent`. `agree` sets `consented` and moves to the quiz. `decline` drops the photo. `analyze` sends a photo only when `consented` is true. `back` from an unanswered consent also drops the photo.

The crop and the traits already leave the browser only inside the analyze request, which fires after the last quiz question. So the consent step never protected a moment of upload. It was a reading stop placed before the quiz.

`/privacy` (`legal-pages`, approved by the user 2026-10-10) says: "We use your face crop because you agree to it on the consent screen, and the rest of your data to give you the report you asked for."

## Goals / Non-Goals

**Goals:**

- One screen fewer between a passing photo and the quiz.
- Disclosure before the person chooses a photo, so they are never surprised later.
- Legal text that matches the flow, with nothing citing a screen that is gone.

**Non-Goals:**

- No change to what is sent, when it is sent, or how long it is kept.
- No cookie banner (BL-19).

## Decisions

**1. The legal basis moves from consent to "needed for the analysis you asked for".**

Under the GDPR, Art. 6(1)(b), the analysis is the service the person asks for when they choose a photo and run it. The crop is processed only to give that analysis, then deleted within 24 hours.

The crop is not biometric data under Art. 9. A photo becomes biometric data only when it is processed to identify a person uniquely (recital 51). Seasonly reads colors, and `/privacy` already says the landmarks never identify anyone.

The page already gives this basis for the rest of the data, so one sentence covers all of it.

- Alternative: keep consent as the basis, with "taking or uploading a photo means you agree" on the guide. Rejected. Consent given by taking an action is weak under the GDPR: it must be an unambiguous, separate act. If it is weak, the policy would rest on it anyway, and consent can also be withdrawn mid-analysis. The contract basis needs neither.
- This is a legal call. The user reviews the new sentence, as they did the page in `t8-photo-privacy` (task 1.2 gate). There is no outside legal reviewer, the same as before.

**2. The disclosure sits on the guide, under the two actions, as one caption-sized notice with a privacy link.**

The guide is the step where the person decides to use a photo. A notice there is read at the point of choice, and it adds no tap.

- Alternative: only the privacy and terms pages. Rejected: nobody reads them at the moment of choosing. The flow would then send a face crop with no word about it on the way.
- Alternative: a line on the quiz's first question. Rejected: by then the photo is already chosen.
- The notice says "once the quiz is finished". This is true and it is the honest reassurance: until the last answer, leaving sends nothing.

**3. The machine loses the state rather than skipping it.**

The following go:

- the `consent` step, the `agree` and `decline` events, and the `consented` flag;
- the `back` branch that drops an unanswered consent's photo;
- the `previous.name === "consent"` redirect.

`checked` with a pass becomes `afterPhoto({ ...next, quizOnly: false }, replace)`. It is replaced, so Back from the quiz skips the spinner, as it did from consent. `analyze` sends `s.photo` as it is: nothing else holds a photo that was not meant to be sent.

- Alternative: keep the step behind a flag. Rejected: it is dead code and a second path to test.

**4. `consent_answered` is removed, not kept as an always-true event.**

It would measure nothing. The saved funnel drops its optional Consent step by hand. Its old data stays in PostHog.

**5. Citations move with the requirement.**

The removed requirement's anchors are cited from `flow-state.test.ts` and `consent.test.tsx`. The CI citation gate fails on a dead anchor, so each test that changes moves to the new anchors in the same task.

## Risks / Trade-offs

- [A regulator or a user reads the missing consent screen as less care] → The disclosure still comes before any upload and now comes earlier. The policy states a basis that fits the processing. The user approves the wording.
- [Some people no longer see the face crop before it goes] → The analyzing step still shows the crop while the report is written. The notice says exactly what is cropped.
- [US state biometric laws, such as BIPA] → The face landmarks run on the device and are never sent or stored by Seasonly, so no face geometry reaches the server. This is unchanged by this change and noted only so it is not reopened here.
- [The funnel's history has a Consent step that newer data lacks] → The step was optional, so earlier conversions still read the same. The change date goes in the tasks.

## Migration Plan

This ships as one PR. There is no data migration. Rollback is a revert: the old step needs no stored state.

## Open Questions

None.
