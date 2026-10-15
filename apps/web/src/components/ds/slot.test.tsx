import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Slot } from "./index";

const html = (el: ReactElement) => renderToStaticMarkup(el);

describe("Slot", () => {
  /** {@link openspec/specs/ui-components/spec.md#scenario-a-slot-asked-to-load-lazily} */
  it("marks its image lazy and keeps its alt", () => {
    const out = html(<Slot src="/a.webp" alt="A face" loading="lazy" />);
    expect(out).toContain('<img src="/a.webp" alt="A face" loading="lazy"/>');
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-slot-with-no-loading-asked} */
  it("leaves the browser's default loading when none is asked", () => {
    const out = html(<Slot src="/a.webp" />);
    expect(out).toContain('<img src="/a.webp" alt=""/>');
    expect(out).not.toContain("loading");
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-slot-with-no-image} */
  it("shows its label and no image when it has no image", () => {
    const out = html(<Slot />);
    expect(out).toBe('<div class="sn-slot"><span class="sn-slot__label">Photo</span></div>');
    expect(html(<Slot label="Your photo" />)).toContain(
      '<span class="sn-slot__label">Your photo</span>',
    );
    expect(out).not.toContain("<img");
  });
});
