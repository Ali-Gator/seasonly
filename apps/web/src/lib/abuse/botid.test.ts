import { describe, expect, it } from "vitest";

import { BOTID_PROTECT } from "./botid";

describe("BOTID_PROTECT", () => {
  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-browser-protects-the-request} */
  it("protects the analyze route and the report email route for any report id", () => {
    expect(BOTID_PROTECT).toEqual(
      expect.arrayContaining([
        { path: "/api/analyze", method: "POST" },
        { path: "/api/reports/*/email", method: "POST" },
      ]),
    );
  });
});
