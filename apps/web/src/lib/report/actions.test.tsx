import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SaveButtonView } from "./actions";

describe("SaveButtonView", () => {
  /** {@link openspec/specs/report-page/spec.md#scenario-saved} */
  it("reads Saved with a check and is disabled once handed over", () => {
    const saved = renderToStaticMarkup(<SaveButtonView saved onClick={() => {}} />);
    expect(saved).toMatch(/aria-disabled="true"/);
    expect(saved).toMatch(/<svg[\s\S]*Saved<\/button>$/);
    const idle = renderToStaticMarkup(<SaveButtonView saved={false} onClick={() => {}} />);
    expect(idle).toContain(">Save my palette</button>");
    expect(idle).not.toContain("aria-disabled");
  });
});
