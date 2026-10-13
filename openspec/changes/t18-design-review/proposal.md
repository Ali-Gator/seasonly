## Why

The design review of seasonly.me on 2026-10-12 (review canvas https://claude.ai/artifact/FfrfqHQseRtUzN8EL2fLZ6) found that the build follows the approved MVP canvas closely, but the canvas itself shows color too late and makes the photo path harder than it needs to be. On a phone, the landing's first screen has no color at all. The first swatch sits 770 px down on the landing, about 1,240 px on the sample report and 1,386 px on a season page. The draping preview, the report's proof, puts a white ring and the photo's grey background between the skin and the color. The guide, the second failed photo and the quiz each cost extra scrolling or taps. The user approved every finding on 2026-10-12. Launch is 2026-10-26, and visitors come from TikTok to see colors.

## What Changes

- **Color in the first screen.** Below 1024 px, the landing hero shows a strip of 12 Soft Autumn chips under the headline, linking to the sample report. On the report, the sample report and a season page, the palette comes straight after the season name and tagline at phone width, and the long copy follows it. The wide layouts keep their columns.
- **A draping preview that drapes.** DrapingPair drops the white ring, zooms the face to fill its oval, and brings the color up to the chin. Removing the background from the stored crop is out of scope (see below).
- **A one-screen photo guide.** One card shows the good reference photo beside the three "Avoid" photos, so "Take a selfie" and "Upload a photo" land in the first phone screen. The heading and lead keep their words. The three tips become the three "Avoid" captions.
- **The second failed photo says so.** The heading becomes "Let’s try once more", with the line "That’s two tries. Try once more, or go on with the quiz alone." The check's own verdict note stays. "Continue with the quiz only" becomes the secondary button under "Retake photo", above the fold. The photo shrinks to a thumbnail.
- **A shorter quiz.** One progress row ("Step 2 of 3 · Question 1 of 4"), with the Quiz bar filling by quarters. Tapping an option moves on by itself. Keyboard choices still need "Next". The veins, jewelry and hair questions get example photos of the site's fictional person. These come from a paid image run that waits for the user's yes.
- **A shorter landing.** The 12-seasons block shows each season as one row of four chips, with no names or hex codes; the names stay one tap away on `/seasons`. Each season name becomes an `h3` (BL-25). The closing "Start with a selfie" becomes the primary button.
- **Desktop picks upload.** From 1024 px, "Upload a photo" is the primary action on the landing hero and the photo guide, and "Take a selfie" the secondary.
- **Swatch names line up.** A swatch name keeps two lines' height and breaks only between words (BL-38), so hex codes align across a row.
- **A blocked request gets its own screen.** **BREAKING** for the season-reveal spec: when the analyze route answers 403, the flow no longer offers "Try again". It shows "We couldn’t check this browser" and asks the person to open seasonly.me in Safari or Chrome. Other failures keep "Try again".
- **No browser focus ring on a heading.** A flow heading that takes focus for screen readers draws no outline, and the first screen does not move focus at all (BL-41).
- **Headline polish.** Headings use balanced wrapping, and serif headings use the typographic apostrophe (’).
- **Canvas first.** The MVP canvas and the design system get the changed boards and components before any code, and the user approves them (CLAUDE.md).
- **Folded in:** BL-25, BL-38 and BL-41, each deleted from `docs/backlog.md` when it ships.
- **Not in scope:**
  - Background removal from the stored face crop. It changes what is uploaded and stored, so it needs its own privacy review. Logged as a new backlog item.
  - Screens past the photo check that the review could not reach live: consent, analyzing, reveal, email and share. A manual run in the user's Chrome covers them in this change's checks.
  - Curly apostrophes in body copy, emails and share images. Instrument Sans renders the straight one cleanly.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: DrapingPair's frame (no ring, zoomed face, color to the chin); swatch names keep two lines and break between words; a new chip-only `SwatchStrip`; StepProgress can show a sub-step ("Question n of 4") and fill the current bar; QuizOption gets its image slot back; PhotoTipCard gains a one-reference, three-avoid layout; headings that take focus draw no outline.
- `capture-flow`: the one-screen guide; the second-failure retake screen; desktop order of the guide's actions; the first screen does not take focus.
- `quiz`: one progress row; a pointer choice moves on by itself; example photos for veins, jewelry and hair.
- `season-reveal`: a 403 from the analyze route shows the blocked-browser screen instead of "Try again".
- `site-content`: the landing hero strip, the compact 12-seasons strips with `h3` names, the primary closing action and the desktop action order; a season page and the sample report put the palette before the long copy at phone width.
- `report-page`: the palette comes straight after the season name and tagline at phone width.

## Impact

- `apps/web/src/components/ds/`: `draping-pair.tsx`, `swatch.tsx` (+ `SwatchStrip`), `step-progress.tsx`, `quiz-option.tsx`, `photo-tip-card.tsx`, `ds.css`, `index.ts`; `apps/web/src/app/globals.css` for the heading focus and wrapping rules.
- `apps/web/src/app/(flow)/analyze/`: `flow.tsx` (first-screen focus, 403 handling), `flow-state.ts` (a blocked failure, the retake count), `_capture/steps.tsx`, `_quiz/quiz.tsx`, `_reveal/steps.tsx`.
- `apps/web/src/app/(site)/page.tsx`, `seasons/[season]/page.tsx`, `sample-report/page.tsx`; `apps/web/src/lib/site-content/season-link.tsx`, `images.ts`; `apps/web/src/lib/report/sections.tsx`, `view.tsx`.
- `apps/web/public/images/quiz/`: new example photos, made by `scripts/generate-photos.ts` (an image model through the AI Gateway, as in `t9-site-content`). The run costs about $0.50, at most $1, and starts only after the user's yes.
- Design: the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) boards 01, 02, 04f, 06, 08d, 10, 15, 16 and 18, and the Seasonly design system's DrapingPair, Swatch, StepProgress, QuizOption and PhotoTipCard, plus a SwatchStrip with a README line.
- Tests: some existing tests assert copy or behavior this changes (the guide layout, the second-failure screen, a 403's retry, the landing's strip swatches, the quiz's Next). Each edit needs the user's approval and is listed in tasks.
- Plan: a new Tracker row, T18 "Design review fixes"; `docs/backlog.md` loses BL-25, BL-38 and BL-41 and gains the crop-background item.
- No new dependencies. No database, API or analysis-core change.
