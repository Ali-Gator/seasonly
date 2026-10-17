## Context

See proposal.md (Why). The current state that shapes the approach:

- `/analyze` is a static shell (site-structure's route table). `page.tsx` renders the client `Flow`. `useReducer(reduce, undefined, initialState)` always starts on `{ name: "guide" }`, on the server and in the browser.
- `Flow` maps the reducer's trail onto history. On mount it records `base` from `history.state.depth`. It pushes `{ depth: base + depth }` per new trail entry. A popstate below `base` leaves the flow. A step change scrolls to the top and focuses `main h1`. The `focused` ref skips the step the flow mounted on.
- The landing's hero links are `Button href="/analyze"` (next/link), so the tap is a soft navigation and `Flow` mounts on the client without hydration. A visit typed or pasted in the address bar is a hard load: the server HTML shows the guide, then hydrates.
- Next 16.3.8's `HistoryUpdater` writes the new URL in `useInsertionEffect`. React runs every insertion effect of a commit before any layout effect. So `location.search` already reads `?start=camera` when `Flow`'s layout effect runs on a soft navigation, before the first paint.
- PostHog runs with `defaults: "2025-05-24"`, which captures `$pageview` on history changes. It counts a change only when the pathname changes, so the flow's own `pushState` calls fire none today (funnel.spec.ts).
- `EmailInput` passes its other props to the `<input>`. jsdom has no `matchMedia`.

## Goals / Non-Goals

**Goals:**

- On a soft navigation from the landing, the first painted screen of `/analyze?start=camera` is the camera. The guide never shows.
- The static shell stays static. No new route, no server read of `searchParams`.
- The history model stays one rule: the capture step opened this way is trail entry 0, exactly as the guide is on a normal visit.

**Non-Goals:**

- A flash-free camera start on a hard load of `/analyze?start=camera`. Nobody links there except the landing's own soft navigation. A pasted URL shows the guide for one frame, then the camera.
- Remembering the start across a reload. The parameter is stripped on purpose (capture-flow: a reload starts at the guide).

## Decisions

### 1. The intent travels as `?start=camera`, read in a mount-time layout effect

`Flow` gains one `useLayoutEffect(() => {...}, [])`. It reads `new URLSearchParams(location.search).get("start")`. On `"camera"` it dispatches `{ type: "start-camera" }` and calls `history.replaceState(history.state, "", "/analyze")`. The layout effect runs before paint, so the soft navigation paints the camera directly.

- _Server `searchParams` prop in `page.tsx`:_ rejected. Reading it makes `/analyze` dynamic, against site-structure's "Static shell", and the gain covers only the rare hard load.
- _`useSearchParams()`:_ rejected. On a static route it needs a Suspense boundary and client-renders the subtree, so the prerendered guide HTML would be lost for every visitor.
- _`sessionStorage` flag set by the landing's click:_ rejected. It leaks into a later visit when the tap opened a new tab, and it still needs the same mount-time read.
- _A separate route such as `/analyze/camera`:_ rejected. It breaks "every step renders at `/analyze`" and adds a page to `routes.ts`, robots and the sitemap rules.

### 2. `start-camera` replaces the guide, with no history entry

The reducer's new event sets `step` to `{ name: "capture" }` and leaves `trail` empty. It is a replace, not a push, so `depth` stays 0 and the push effect adds no entry. The capture step owns the entry the flow mounted on, so browser Back pops straight to the landing through the existing "below base" rule. This needs no new branch in `onPop`. The event is accepted only while the step is the initial guide with an empty trail, so a late dispatch cannot pull a person out of the quiz.

- _Push the capture step over the guide:_ rejected. Back would land on the guide the person skipped, which is the extra step this change removes.

### 3. The opening-screen focus rule follows the replaced step

The `focused` ref starts as the initial guide step. `start-camera` changes the step, so the focus effect would focus the capture heading and scroll, which breaks "the screen the flow opens on does not take focus". The mount-time effect therefore sets `focused.current` to the step it dispatches. In practice `reduce` is called once by hand to get the new step, which is then both dispatched and stored. The existing comparison then skips it like the opening guide. StrictMode's double mount runs the layout effect twice. The second run finds no parameter, because the first stripped it, so it does nothing.

### 4. One `UploadNotice` for the guide and the capture step

The lock-icon paragraph moves out of `Guide` into an `UploadNotice` component in `_capture/steps.tsx`. `Guide` and `Capture` both render it below their actions. The capture step shows it always, not only after `?start=camera`, so there is one capture screen to design, test and keep in sync with `/privacy`. `CAMERA_CAPTION` becomes the approved caption.

- _Show the notice only when the guide was skipped:_ rejected. It would mean a second capture layout, and repeating the notice next to the shutter costs one paragraph below the fold.

### 5. Desktop email focus: a `data-autofocus` target picked by the flow's focus effect

The flow's focus effect, which already runs after every step change, picks its target as follows:

```
const fine = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches
const target = (fine && main.querySelector("[data-autofocus]")) || main.querySelector("h1")
```

`EmailForm` puts `data-autofocus` on its `EmailInput`. The choice stays in one place, so the email step's own effect cannot race the parent's. Parent effects run after child effects, so a child-level `focus()` would be overwritten by the heading.

- _`autoFocus` on the input:_ rejected. React's `autoFocus` fires on mount on every device, phones included, and the flow's effect would then move focus to the heading anyway.
- _`(pointer: fine)` alone:_ rejected. Some Android tablets with a stylus report fine. Requiring `hover: hover` too keeps it to mice and trackpads.

The optional call `matchMedia?.` keeps jsdom, which has no `matchMedia`, on the heading path. So the existing DOM focus tests hold unchanged, and the new desktop test stubs `matchMedia`.

## Risks / Trade-offs

- [Photos get worse without the guide's examples] → The capture caption now names window light, no makeup and no filter. The landing above the tapped button already showed the tip card. `photo_checked` carries the attempt number and the failure reason, so if retakes rise after launch, BL-style follow-up can bring a compact tip strip to the camera. No new event: the landing pageview's `$current_url` already carries `?start=camera`.
- [Next changes when it writes the URL (insertion effect)] → The E2E test taps the landing button and asserts that the guide heading is never visible: a `waitFor` on the capture heading, with the guide asserted absent first. A regression then fails CI rather than flashing the guide.
- [`replaceState` behind Next's router] → Next 16 syncs native `pushState`/`replaceState` into its router, and the flow already relies on raw `pushState`. Passing `history.state` through keeps Next's own keys in the entry.
- [The hard load of `?start=camera` flashes the guide for one frame] → Accepted (Non-Goals). Nothing links there except the soft navigation.
- [A screen-reader user on a desktop lands in the field, not on the heading] → The field's label "Where should we send your report?" and its hint are read on focus, and the heading stays one Shift+Tab or heading-jump away. This trade is limited to fine-pointer devices on purpose.

## Migration Plan

None: a client-only change behind a new link target. To roll back, revert the landing href, and the `start` handling becomes dead but harmless.
