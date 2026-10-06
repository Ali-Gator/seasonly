import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CameraFrame, Icon, PhotoTipCard, QuizOption, StepProgress } from "./index";

const html = (el: ReactElement) => renderToStaticMarkup(el);
const glyph = (markup: string) => /<path d="([^"]+)"/.exec(markup)?.[1];
const icon = (name: Parameters<typeof Icon>[0]["name"]) => glyph(html(<Icon name={name} />));

describe("StepProgress", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-on-the-quiz} */
  it("reads the step in text, marks the current step and says (done) for finished ones", () => {
    const out = html(<StepProgress current={1} />);
    expect(out).toMatch(/^<nav class="sn-steps" aria-label="Progress">/);
    expect(out).toContain(">Step 2 of 3</p>");
    const items = out.split("<li").slice(1);
    expect(items).toHaveLength(3);
    const [photo, quiz, result] = items as [string, string, string];
    expect(quiz).toContain('aria-current="step"');
    expect(quiz).toContain("Quiz");
    expect(photo).toContain("Photo");
    expect(glyph(photo)).toBe(icon("check"));
    expect(photo).toContain('<span class="sn-visually-hidden"> (done)</span>');
    expect(photo).not.toContain("aria-current");
    expect(result).not.toContain("(done)");
    expect(result).not.toContain("<svg");
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-step-progress-names-the-current-step-in-text} */
  it("starts on the first step", () => {
    const out = html(<StepProgress />);
    expect(out).toContain(">Step 1 of 3</p>");
    expect(out).not.toContain("(done)");
  });
});

describe("QuizOption", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-an-option-with-a-description} */
  it("is a native radio inside its label, with the label and description as text", () => {
    const out = html(
      <QuizOption
        name="veins"
        value="green"
        label="Green or olive"
        description="Often a warm undertone"
        checked={false}
        onChange={() => {}}
      />,
    );
    expect(out).toMatch(/^<label class="sn-quiz">/);
    expect(out).toMatch(/<input type="radio" class="sn-quiz__input" name="veins" value="green"/);
    expect(out).toContain(">Green or olive</span>");
    expect(out).toContain(">Often a warm undertone</span>");
    expect(out.indexOf("<input")).toBeLessThan(out.indexOf("</label>"));
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-a-quiz-option-is-a-native-radio-inside-its-label} */
  it("passes checked through and leaves the description out when none is given", () => {
    const out = html(
      <QuizOption name="veins" value="unsure" label="Hard to tell" checked onChange={() => {}} />,
    );
    expect(out).toContain('checked=""');
    expect(out).not.toContain("sn-quiz__desc");
  });
});

describe("CameraFrame", () => {
  const CAPTION = "Fit your face in the oval, at eye level. Hold still.";

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-frame-with-a-caption} */
  it("is a figure with its view, a hidden guide oval and the caption", () => {
    const out = html(
      <CameraFrame caption={CAPTION}>
        <video />
      </CameraFrame>,
    );
    expect(out).toMatch(/^<figure class="sn-camera">/);
    expect(out).toContain("<video>");
    expect(out).toContain('<span class="sn-camera__oval" aria-hidden="true"></span>');
    expect(out).toContain(`<figcaption class="sn-camera__caption">${CAPTION}</figcaption>`);
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-no-guide} */
  it("leaves the oval out when the guide is off, and shows a labeled placeholder with no view", () => {
    const out = html(<CameraFrame guide={false} label="Your photo, as taken" />);
    expect(out).not.toContain("sn-camera__oval");
    expect(out).toContain(">Your photo, as taken</span>");
    expect(out).not.toContain("<figcaption");
  });
});

describe("PhotoTipCard", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-the-light-tip} */
  it("shows the heading and a good and an avoid example, each in words with an icon", () => {
    const out = html(
      <PhotoTipCard
        title="Face a window"
        body="Natural daylight from the front."
        good={{ caption: "Facing a window" }}
        bad={{ caption: "Under a ceiling lamp" }}
      />,
    );
    expect(out).toContain('<h3 class="h3">Face a window</h3>');
    expect(out).toContain(">Natural daylight from the front.</p>");
    const [good, bad] = out.split("<figure").slice(1) as [string, string];
    expect(good).toMatch(/Good<\/span><span class="sn-tip__caption">Facing a window<\/span>/);
    expect(glyph(good)).toBe(icon("check"));
    expect(good).toContain(">Good photo</span>");
    expect(bad).toMatch(/Avoid<\/span><span class="sn-tip__caption">Under a ceiling lamp<\/span>/);
    expect(glyph(bad)).toBe(icon("cross"));
  });

  /** {@link openspec/specs/ui-components/spec.md#requirement-a-photo-tip-card-tells-good-from-bad-in-words} */
  it("shows an example's image when given one", () => {
    const out = html(
      <PhotoTipCard
        title="No filter"
        good={{ caption: "Straight from the camera", src: "/good.jpg", alt: "A plain selfie" }}
        bad={{ caption: "Beauty filter on" }}
      />,
    );
    expect(out).toContain('<img src="/good.jpg" alt="A plain selfie"/>');
    expect(out).toContain(">Bad photo</span>");
  });
});
