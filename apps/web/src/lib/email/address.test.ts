import { describe, expect, it } from "vitest";

import { parseEmail } from "./address";

describe("parseEmail", () => {
  /** {@link openspec/specs/email-capture/spec.md#scenario-a-valid-address} */
  it("drops surrounding spaces and lowercases", () => {
    expect(parseEmail(" Maya.Reyes@Gmail.com ")).toBe("maya.reyes@gmail.com");
    expect(parseEmail("a+b@mail.co.uk")).toBe("a+b@mail.co.uk");
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-a-typo} */
  it("refuses empty, malformed and over-long addresses", () => {
    for (const bad of [
      "",
      "   ",
      "maya.reyes@gmail",
      "not-an-email",
      "@gmail.com",
      "a@.com",
      "a b@c.de",
      42,
      null,
    ]) {
      expect(parseEmail(bad), String(bad)).toBeNull();
    }
    const at254 = `${"a".repeat(242)}@example.com`;
    expect(at254).toHaveLength(254);
    expect(parseEmail(at254)).toBe(at254);
    expect(parseEmail(`a${at254}`)).toBeNull();
  });
});
