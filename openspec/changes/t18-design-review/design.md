## Context

See proposal.md for the why. The findings and four proposal mockups (P1 hero strip, P2 draping, P3 second failure, P4 quiz) are on the review canvas (https://claude.ai/artifact/FfrfqHQseRtUzN8EL2fLZ6). The user approved every finding on 2026-10-12.

What constrains the approach:

- The approved MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) is the source of truth for layout and copy. CLAUDE.md requires the user's approval of changed boards before UI code.
- `apps/web/src/components/ds/` ports the Seasonly design system's `bundle.js` and `bundle.css`. A component change lands in the design system first, then in the port.
- The report (`lib/report/view.tsx`, `sections.tsx`) renders one DOM in phone reading order, and a 12-column grid rearranges it from 1024 px (`t5-analysis-flow` design decision 7). The sample report reuses `ReportSections`.
- The flow focuses `main h1` on every step change (`flow.tsx`), including the first render. That is BL-41.
- The analyze route answers 403 only from `checkBotId` (`api/analyze/route.ts`). Rate limits answer differently.
- The guide's example photos and the sample face came from `scripts/generate-photos.ts`, an image model through the AI Gateway, as one fictional woman (`t9-site-content` decision 4).

## Goals / Non-Goals

**Goals:**

- Ship the approved review fixes with one DOM per page and no JavaScript-only layout, so server HTML and tests see the final order.
- Keep each design-system component's change in the design system, the canvas and the port alike.

**Non-Goals:**

- Removing the background from the stored face crop. That changes what is uploaded and stored, so it needs its own privacy review (a new backlog item).
- New analytics events or properties. A blocked request still sends `analysis_failed` as today.
- Changing the wide (1024 px+) layouts beyond the action order.

## Decisions

### 1. Canvas and design system first, in one approval

Task group 1 edits the MVP canvas in place and the design system's components, then the user approves them before any UI code (CLAUDE.md). The changed boards are 01 Landing (375 and 1280), 02 Guide, 04f Second failure, 06 Quiz 1 to 4, a new 08g Blocked browser, 10 Full report (375), 16 Season (375) and 18 Sample report. The design system gains SwatchStrip and the changes to DrapingPair, Swatch, StepProgress and PhotoTipCard, plus a README line saying where a chip-only strip is allowed: a preview whose names are one tap away. The canvas copies the new `bundle.js` by hand, as in `t9-site-content`.

- **Alternative: code first, canvas after.** Rejected. CLAUDE.md makes the canvas the approval gate for UI work.

### 2. Palette first on a phone: split the season block, place it by grid

`ReportSections` renders the season block in two parts: the head (overline, name, tagline) and the rest (summary, traits, agreement note). The DOM order is head, section 1, rest, sections 2 to 6. That order is the phone order, and a screen reader hears it the same way. From 1024 px, the grid puts the head and the rest in the left column, one row each, and moves the actions, Premium card and footer one row down. The sections keep the right column. The season page does the same with its own head, palette and description.

- **Alternative: CSS `order` on a phone only.** Rejected. Reading order would differ from visual order on the phone, the main audience.
- **Alternative: render the palette twice and hide one.** Rejected. Tests and screen readers would see 48 swatches.

### 3. Hero strip: SwatchStrip below 1024 px

The landing hero gets a `SwatchStrip` of the 12 sample colors (the same list as "This is a Soft Autumn") in a 6-column grid on a `surface` card, between the headline and the lead. It is `lg:hidden`, because the wide hero already shows the sample palette beside the copy. The landing's 12-season block uses `SwatchStrip` for each season's four highlights. `SeasonLink` takes a `compact` flag for this, so `/seasons` and the neighbours keep names and hex codes. The season name becomes an `h3` wrapping its link (BL-25).

### 4. Draping: CSS only

`.sn-drape__face` loses its `box-shadow` ring. The image keeps `object-fit: cover` and gets a zoom (`transform: scale(1.35)`, centered slightly above middle), so the stored crop's margin (`cropBox`'s `MARGIN`) falls outside the oval. A `::after` on `.sn-drape__frame`, with `background: inherit` from the frame's inline color, draws the curved collar over the bottom of the oval. No change to the crop or the face route. The photo's own background still shows at the oval's edges. Removing it is the follow-up named in Non-Goals.

### 5. Guide: one card, one reference, three to avoid

`PhotoTipCard` accepts `bad` as one example or a list. With a list, the good reference takes the left column at 3:4, and the three bad examples stack in the right column, each a small 3:4 thumbnail with "Avoid" and its caption: "Ceiling lamp", "Foundation", "Beauty filter". The card's title is "Face a window, bare skin, no filter". The page keeps its heading and lead, which already name the three tips. The tip bodies move into the bad examples' alt text. The target is both actions inside 812 px at 375 px wide, checked in the browser at task 9.

- **Alternative: a sticky action bar.** Rejected. It covers the photos, and the flow has no sticky elements elsewhere.

### 6. Desktop action order: swap the fill, keep the DOM

On the landing hero and the guide, the DOM keeps "Take a selfie" first. From 1024 px a modifier class swaps the two fills (`.sn-btn--lg-swap`: primary becomes secondary and back), and the guide's stack uses `lg:flex-col-reverse`, so the primary sits on top. The hero's actions sit in a row, where the primary may sit second. Tests and server HTML see one set of buttons.

- **Alternative: two button groups, one hidden per width.** Rejected. Each name would exist twice in the DOM, and jsdom tests cannot tell which one is hidden.
- **Trade-off:** on the desktop guide, Tab order (selfie, then upload) runs against the visual order (upload on top). Two adjacent buttons make this a small cost.

### 7. Quiz: advance on a pointer choice only

`QuizOption`'s input keeps `onChange` for the answer. An `onClick` with `event.detail > 0` (a real pointer click; a keyboard Space gives 0, and arrow keys fire no click) schedules the next question after 300 ms, unless it is the last question. The timer is cleared on unmount and ignored if the question changed. A tap on an already chosen option also advances, because click fires without change. "Next" stays for the keyboard and as a visible fallback. The line "Tap an answer to go on." sits above the options. That gives the advance notice WCAG 3.2.2 asks for.

`StepProgress` takes `sub={{ index, count }}`. The count line reads "Step 2 of 3 · Question n of 4", and the current bar fills by `(index + 1) / count` through a CSS custom property. The quiz drops its own overline.

- **Alternative: advance on `onChange`.** Rejected. Arrow keys would jump questions.

### 8. Quiz photos: one more paid batch through the existing script

`scripts/generate-photos.ts` gains a `quiz` set. One base wrist is edited into three vein colors. The base face is edited into four natural hair colors. The base wrist is edited into gold, silver and both kinds of jewelry. That makes 10 images in one batch, about $0.04 each, so about $0.50 with retries and at most $1. The batch runs only after the user's yes. The user then approves every image on the canvas. Outputs are 1:1 WebP, at most about 40 KB, in `apps/web/public/images/quiz/`, with paths and alt text in `lib/site-content/images.ts`.

### 9. Blocked request: a step of its own

`flow.tsx` dispatches `failed` with `blocked: res.status === 403`. `flow-state.ts` maps that to `{ name: "error", blocked: true }`. The reveal steps render `Blocked`: the heading, the line, a "Copy the link" button using `navigator.clipboard.writeText`, and the URL `seasonly.me/analyze` as visible text for when the clipboard is refused. `analysis_failed` fires as today, unchanged.

### 10. Focus and headings: a guard and two CSS rules

The step-focus effect skips its first run when the step is the guide, so opening `/analyze` leaves focus alone. Later steps, including Back to the guide, still move focus. `globals.css` adds `h1[tabindex="-1"]:focus { outline: none }` and `text-wrap: balance` on `.display, .h1, .h2, .h3`. Serif-heading copy with an apostrophe switches to ’. There are three today: "Let’s retake this one", "What’s your natural hair color, without dye?", and the new "Let’s try once more" and "We couldn’t check this browser".

### 11. Swatch names: two lines, break between words

`.sn-swatch__name` gets `min-height: 36px` (two 18 px lines), `overflow-wrap: normal` and `word-break: normal`, replacing `overflow-wrap: anywhere` (BL-38). Six columns stay 1024 px and up, where a column is at least about 72 px. Narrower grids use four or three columns.

## Risks / Trade-offs

- [The hero strip duplicates the 12 sample colors shown about 800 px below] → The strip has no names and links to the sample report. The sample block explains names and hex codes. Both stay, as approved on P1.
- [The chip-only strips break the design system's "pair every color with its name and hex" rule] → Names stay readable by screen readers and are one tap away. The design system README gets the exception (decision 1).
- [Auto-advance surprises someone mid-thought] → The 300 ms pause shows the choice, Back returns with the answer kept, and the line above the options says it will happen.
- [A bot-check false positive in TikTok's or Instagram's in-app browser blocks real visitors] → The blocked screen gives them a way out. Task 9 checks both in-app browsers on a phone. If they are blocked, that becomes a new backlog item for the bot check itself.
- [The guide card may not fit 812 px with long captions] → It is checked in the browser at task 9. Shorter captions are the fallback, not a sticky bar.
- [Existing tests assert the changed copy and Next clicks] → Tasks list each edit. The user approves them before they are made (CLAUDE.md).
- [Image generation drifts the face or the wrist] → Each set is edited from one base image, as in `t9-site-content`. The user approves every image.

## Migration Plan

UI and static images only, with no data or API change. Deploy through the normal PR to `main`. Rollback is a revert of the merge.
