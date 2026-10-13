// @vitest-environment jsdom
/**
 * The /analyze flow in a DOM (t18-design-review): focus on the first screen and after it, the
 * quiz's one progress row and its move on a tap, and the screen for a refused request. The
 * photo check, the models and analytics are stubbed; the steps, the reducer and history are real.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import type { ReactNode } from "react";
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/capture/mediapipe", () => ({ loadVision: () => Promise.resolve() }));
vi.mock("@/lib/capture/photo", () => ({
  checkImage: () =>
    Promise.resolve({
      problem: null,
      faceCount: 1,
      measures: {},
      preview: new Blob(["p"]),
      traits: { temperature: 0.4, value: 0, clarity: -0.8 },
      crop: new Blob(["c"], { type: "image/jpeg" }),
    }),
}));
vi.mock("@/lib/capture/events", () => ({ track: vi.fn(), photoCheckedProps: () => ({}) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { Flow } = await import("./flow");

let root: Root;
let container: HTMLDivElement;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = () => {};
  URL.createObjectURL = () => "blob:test";
  URL.revokeObjectURL = () => {};
  // jsdom has no ImageBitmap; the flow only checks for one.
  (globalThis as { ImageBitmap?: unknown }).ImageBitmap ??= class {};
});

beforeEach(async () => {
  history.replaceState(null, "", "/analyze");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  // StrictMode runs each effect twice on mount, as `next dev` does: the focus guard must hold.
  await act(async () =>
    root.render(
      <StrictMode>
        <Flow />
      </StrictMode>,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const heading = () => container.querySelector("main h1")?.textContent;
const button = (name: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === name);
const option = (label: string) =>
  [...container.querySelectorAll<HTMLLabelElement>("label.sn-quiz")]
    .find((l) => l.querySelector(".sn-quiz__label")?.textContent === label)
    ?.querySelector("input");
/** A pointer tap: a click with a click count, on the option's radio. */
const tap = (label: string) =>
  act(() => {
    option(label)?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
  });
/** A keyboard choice: Space or an arrow key fires a click with no click count. */
const key = (label: string) =>
  act(() => {
    option(label)?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
  });
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

/** Uploads a photo the stubbed check passes, which opens the quiz. */
async function toQuiz() {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no upload input");
  Object.defineProperty(input, "files", { value: [new File(["x"], "me.jpg")], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => {});
}

const QUESTION_1 = "Look at the veins on your inner wrist in daylight. What color are they?";
const QUESTION_2 =
  "Hold gold and silver jewelry against your skin. Which one looks more natural on you?";
const QUESTION_3 = "What does your skin do in the sun without sunscreen?";
const QUESTION_4 = "What’s your natural hair color, without dye?";

describe("focus", () => {
  /** {@link openspec/specs/capture-flow/spec.md#scenario-opening-the-flow} */
  it("leaves focus alone when /analyze opens, and draws no outline on a focused heading", () => {
    expect(heading()).toBe("Three things before your selfie");
    expect(document.activeElement).toBe(document.body);
    const globals = fs.readFileSync(
      path.resolve(import.meta.dirname, "../../globals.css"),
      "utf-8",
    );
    expect(globals).toMatch(/h1\[tabindex="-1"\]:focus\s*\{[^}]*outline:\s*none/);
  });

  /** {@link openspec/specs/capture-flow/spec.md#scenario-a-new-step} */
  it("moves focus to the capture step's heading after Take a selfie", async () => {
    await act(async () => button("Take a selfie")?.click());
    expect(heading()).toBe("Take your selfie");
    expect(document.activeElement).toBe(container.querySelector("main h1"));
  });
});

describe("quiz", () => {
  beforeEach(toQuiz);

  /** {@link openspec/specs/quiz/spec.md#scenario-the-first-question} */
  it("shows one progress row with the question count", () => {
    expect(heading()).toBe(QUESTION_1);
    const text = container.textContent ?? "";
    expect(container.querySelector(".sn-steps__count")?.textContent).toBe(
      "Step 2 of 3 · Question 1 of 4",
    );
    expect(text.split("Question 1 of 4")).toHaveLength(2);
    expect(text).toContain("Tap an answer to go on.");
  });

  /** {@link openspec/specs/quiz/spec.md#scenario-a-tap-moves-on} */
  it("moves on about 300 ms after a tap", async () => {
    vi.useFakeTimers();
    await tap("Green or olive");
    expect(option("Green or olive")?.checked).toBe(true);
    await wait(299);
    expect(heading()).toBe(QUESTION_1);
    await wait(1);
    expect(heading()).toBe(QUESTION_2);
    expect(container.querySelector(".sn-steps__count")?.textContent).toBe(
      "Step 2 of 3 · Question 2 of 4",
    );
  });

  /** {@link openspec/specs/quiz/spec.md#scenario-the-keyboard-does-not-move-on} */
  it("stays on the question after a keyboard choice, with Next ready", async () => {
    vi.useFakeTimers();
    await key("Blue or purple");
    await wait(1000);
    expect(heading()).toBe(QUESTION_1);
    expect(option("Blue or purple")?.checked).toBe(true);
    expect(button("Next")?.disabled).toBe(false);
  });

  /** {@link openspec/specs/quiz/spec.md#scenario-a-tap-on-an-answered-question} */
  it("moves on after a tap on the option already chosen", async () => {
    vi.useFakeTimers();
    await key("Green or olive");
    await wait(1000);
    expect(heading()).toBe(QUESTION_1);
    await tap("Green or olive");
    await wait(300);
    expect(heading()).toBe(QUESTION_2);
  });

  /** {@link openspec/specs/quiz/spec.md#scenario-the-veins-question} */
  it("shows an example photo with alt text on each veins option but Hard to tell", () => {
    for (const label of ["Green or olive", "Blue or purple", "A mix of both"]) {
      const img = option(label)?.closest("label")?.querySelector("img");
      expect(img?.getAttribute("src"), label).toMatch(/^\/images\/quiz\/veins-[a-z]+\.webp$/);
      expect(img?.getAttribute("alt")?.trim(), label).toBeTruthy();
    }
    expect(option("Hard to tell")?.closest("label")?.querySelector("img")).toBeNull();
  });

  /** {@link openspec/specs/quiz/spec.md#scenario-the-sun-question} */
  it("shows no photos on the sun question", async () => {
    for (const label of ["Green or olive", "Gold"]) {
      await key(label);
      await act(async () => button("Next")?.click());
    }
    expect(heading()).toBe(QUESTION_3);
    expect(container.querySelector("fieldset img")).toBeNull();
  });

  /** {@link openspec/specs/quiz/spec.md#scenario-a-tap-moves-on} */
  it("moves on once when Next is pressed before a tap's pause ends", async () => {
    vi.useFakeTimers();
    await tap("Green or olive");
    await act(async () => button("Next")?.click());
    expect(heading()).toBe(QUESTION_2);
    await wait(1000);
    expect(heading()).toBe(QUESTION_2);
  });

  /** {@link openspec/specs/quiz/spec.md#scenario-the-last-question-waits} */
  it("waits on the last question for See my result", async () => {
    vi.useFakeTimers();
    for (const label of ["Green or olive", "Gold", "Tans easily, rarely burns"]) {
      await tap(label);
      await wait(300);
    }
    expect(heading()).toBe(QUESTION_4);
    await tap("Medium or light brown");
    await wait(1000);
    expect(heading()).toBe(QUESTION_4);
    expect(button("See my result")?.disabled).toBe(false);
    expect(heading()).not.toBe(QUESTION_3);
  });
});

describe("a refused request", () => {
  /** Answers the four questions and sends them; the route answers `status`. */
  async function analyze(status: number) {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}", { status }))),
    );
    await toQuiz();
    for (const label of ["Green or olive", "Gold", "Tans easily, rarely burns"]) {
      await key(label);
      await act(async () => button("Next")?.click());
    }
    await key("Medium or light brown");
    await act(async () => button("See my result")?.click());
    await act(async () => {});
  }

  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-route-refuses-the-request} */
  it("shows the blocked screen with Copy the link and no Try again on a 403", async () => {
    await analyze(403);
    expect(heading()).toBe("We couldn’t check this browser");
    expect(container.textContent).toContain(
      "Some in-app browsers block our check. Open seasonly.me in Safari or Chrome to continue.",
    );
    expect(container.textContent).toContain("seasonly.me/analyze");
    expect(button("Copy the link")).toBeDefined();
    expect(button("Try again")).toBeUndefined();
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-copying-the-link} */
  it("copies the link and says so", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await analyze(403);
    await act(async () => button("Copy the link")?.click());
    expect(writeText).toHaveBeenCalledWith("https://seasonly.me/analyze");
    expect(button("Link copied")).toBeDefined();
  });

  /** {@link openspec/specs/season-reveal/spec.md#requirement-the-analyzing-step-follows-the-canvas-and-fails-visibly} */
  it("says how to copy by hand when the clipboard refuses, with the link to press", async () => {
    const writeText = vi.fn(() => Promise.reject(new Error("denied")));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await analyze(403);
    await act(async () => button("Copy the link")?.click());
    expect(container.textContent).toContain(
      "Copying didn’t work. Press and hold the link to copy it.",
    );
    expect(container.querySelector('a[href="https://seasonly.me/analyze"]')).not.toBeNull();
    expect(button("Link copied")).toBeUndefined();
  });

  /** {@link openspec/specs/season-reveal/spec.md#scenario-the-route-fails} */
  it("still offers Try again on a 500", async () => {
    await analyze(500);
    expect(heading()).toBe("Something went wrong");
    expect(button("Try again")).toBeDefined();
    expect(button("Copy the link")).toBeUndefined();
  });
});
