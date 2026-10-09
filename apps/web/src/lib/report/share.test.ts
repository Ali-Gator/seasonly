import { describe, expect, it, vi } from "vitest";

import { savePalette, shareSeason } from "./share";

const story = new File([new Uint8Array([1])], "seasonly-soft-autumn-story.png", {
  type: "image/png",
});
const palette = new File([new Uint8Array([2])], "seasonly-soft-autumn-palette.png", {
  type: "image/png",
});
const abort = () => Promise.reject(new DOMException("closed", "AbortError"));

describe("shareSeason", () => {
  /** {@link openspec/specs/report-page/spec.md#scenario-a-phone-that-shares-files} */
  it("hands the story card to the share sheet with the text", async () => {
    const share = vi.fn(async () => {});
    const nav = { canShare: () => true, share };
    expect(await shareSeason({ nav, file: story, season: "Soft Autumn" })).toBe("shared");
    expect(share).toHaveBeenCalledWith({
      files: [story],
      text: "My color season: Soft Autumn. Find yours at seasonly.me",
    });
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-a-desktop-browser} */
  it("opens the panel where files cannot be shared", async () => {
    expect(
      await shareSeason({
        nav: { canShare: () => false, share: vi.fn() },
        file: story,
        season: "Soft Autumn",
      }),
    ).toBe("panel");
    expect(await shareSeason({ nav: {}, file: story, season: "Soft Autumn" })).toBe("panel");
    expect(
      await shareSeason({
        nav: { canShare: () => true, share: vi.fn() },
        file: null,
        season: "Soft Autumn",
      }),
    ).toBe("panel");
  });

  /** {@link openspec/specs/report-page/spec.md#requirement-share-my-season-hands-over-the-share-cards} */
  it("changes nothing when the sheet is closed, and falls back to the panel on an error", async () => {
    expect(
      await shareSeason({
        nav: { canShare: () => true, share: abort },
        file: story,
        season: "Soft Autumn",
      }),
    ).toBe("idle");
    expect(
      await shareSeason({
        nav: {
          canShare: () => true,
          share: () => Promise.reject(new DOMException("", "NotAllowedError")),
        },
        file: story,
        season: "Soft Autumn",
      }),
    ).toBe("panel");
  });
});

describe("savePalette", () => {
  /** {@link openspec/specs/report-page/spec.md#scenario-saved} */
  it("downloads seasonly-<slug>-palette.png where files cannot be shared", async () => {
    const download = vi.fn();
    expect(await savePalette({ nav: {}, file: palette, slug: "soft-autumn", download })).toBe(
      "saved",
    );
    expect(download).toHaveBeenCalledWith(palette, "seasonly-soft-autumn-palette.png");
  });

  it("hands the palette to the share sheet where it can", async () => {
    const share = vi.fn(async () => {});
    const download = vi.fn();
    expect(
      await savePalette({
        nav: { canShare: () => true, share },
        file: palette,
        slug: "soft-autumn",
        download,
      }),
    ).toBe("saved");
    expect(share).toHaveBeenCalledWith({ files: [palette] });
    expect(download).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/report-page/spec.md#scenario-cancelled} */
  it("stays idle when the sheet is closed or the download fails", async () => {
    const download = vi.fn();
    expect(
      await savePalette({
        nav: { canShare: () => true, share: abort },
        file: palette,
        slug: "soft-autumn",
        download,
      }),
    ).toBe("idle");
    expect(download).not.toHaveBeenCalled();
    expect(
      await savePalette({
        nav: {},
        file: null,
        slug: "soft-autumn",
        download: () => {
          throw new Error("no file");
        },
      }),
    ).toBe("idle");
  });

  it("downloads when the share sheet fails for another reason", async () => {
    const download = vi.fn();
    expect(
      await savePalette({
        nav: { canShare: () => true, share: () => Promise.reject(new Error("blocked")) },
        file: palette,
        slug: "soft-autumn",
        download,
      }),
    ).toBe("saved");
    expect(download).toHaveBeenCalledOnce();
  });
});
