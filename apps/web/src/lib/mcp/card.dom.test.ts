// @vitest-environment jsdom
/**
 * The inline card: its markup, and its MCP Apps glue driven with synthetic host messages, run
 * from the very `CARD_HTML` string the resource serves.
 *
 * @see openspec/specs/chat-plugin/spec.md
 */
import { PALETTES, SEASON_COPY } from "@seasonly/analysis";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CARD_HTML, renderCard } from "./card";
import { PLUGIN_LINK, type PluginResult } from "./result";

const SEASON: PluginResult = {
  kind: "season",
  family: "Autumn",
  tagline: SEASON_COPY["soft-autumn"].tagline,
  revealLine: SEASON_COPY["soft-autumn"].revealLine,
  colors: PALETTES["soft-autumn"].highlights.map(({ name, hex }) => ({ name, hex })),
  note: "From the quiz alone. A selfie gives your exact season and all 30 colors.",
  link: PLUGIN_LINK,
};

const NO_RESULT: PluginResult = {
  kind: "no-result",
  reason: "no-answers",
  title: "These answers don't point to one season",
  message: "Every answer was “Not sure” or in between, so there is nothing to go on yet.",
  link: PLUGIN_LINK,
};

const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim() ?? "";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("renderCard", () => {
  /** {@link openspec/specs/chat-plugin/spec.md#scenario-the-card-renders-a-result} */
  it("shows the family, tagline, 6 labelled swatches, the note and one action", () => {
    document.body.innerHTML = renderCard(SEASON);
    const card = text(document.body);
    expect(card).toContain("Your season family");
    expect(card).toContain("Autumn");
    expect(card).toContain(SEASON.tagline);
    const swatches = document.querySelectorAll("li");
    expect(swatches).toHaveLength(6);
    PALETTES["soft-autumn"].highlights.forEach(({ name, hex }, i) => {
      expect(text(swatches[i])).toBe(`${name} ${hex}`);
    });
    expect(card).toContain("From the quiz alone.");
    expect(document.querySelectorAll("button")).toHaveLength(1);
    expect(text(document.querySelector("button"))).toBe("Get my full analysis");
  });

  it("shows a no-result's line and the action, and no swatches", () => {
    document.body.innerHTML = renderCard(NO_RESULT);
    expect(text(document.body)).toContain("These answers don't point to one season");
    expect(text(document.body)).toContain("nothing to go on yet");
    expect(document.querySelectorAll("li")).toHaveLength(0);
    expect(document.querySelectorAll("button")).toHaveLength(1);
  });
});

describe("CARD_HTML glue", () => {
  interface Sent {
    jsonrpc: string;
    id?: number;
    method: string;
    params?: Record<string, unknown>;
  }

  /** Loads the card's body and runs its script; returns what it posts to the host. */
  function boot(): Sent[] {
    const doc = new DOMParser().parseFromString(CARD_HTML, "text/html");
    const scriptEl = doc.querySelector("script");
    const script = scriptEl?.textContent ?? "";
    scriptEl?.remove();
    document.head.innerHTML = doc.head.innerHTML;
    document.body.innerHTML = doc.body.innerHTML;
    const sent: Sent[] = [];
    vi.spyOn(window, "postMessage").mockImplementation((m: unknown) => void sent.push(m as Sent));
    new Function(script)();
    return sent;
  }

  const fromHost = (data: unknown) =>
    window.dispatchEvent(new MessageEvent("message", { data, source: window }));

  it("initializes, renders the tool result and opens the link from its action", () => {
    const sent = boot();
    const init = sent.find((m) => m.method === "ui/initialize");
    expect(init?.params).toMatchObject({ protocolVersion: "2026-01-26" });

    fromHost({ jsonrpc: "2.0", id: init?.id, result: { hostContext: { theme: "dark" } } });
    expect(sent.map((m) => m.method)).toContain("ui/notifications/initialized");
    expect(document.documentElement.dataset.theme).toBe("dark");

    fromHost({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { content: [], structuredContent: SEASON },
    });
    expect(text(document.body)).toContain("Autumn");
    expect(document.querySelectorAll("li")).toHaveLength(6);

    document.querySelector("button")?.click();
    expect(sent.find((m) => m.method === "ui/open-link")?.params).toEqual({ url: PLUGIN_LINK });
  });

  it("ignores messages that do not come from the host", () => {
    boot();
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          jsonrpc: "2.0",
          method: "ui/notifications/tool-result",
          params: { structuredContent: SEASON },
        },
        source: null,
      }),
    );
    expect(document.querySelectorAll("li")).toHaveLength(0);
  });

  it("opens only the plugin's own origin", () => {
    const sent = boot();
    fromHost({
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { structuredContent: { ...SEASON, link: "https://evil.example/" } },
    });
    document.querySelector("button")?.click();
    expect(sent.find((m) => m.method === "ui/open-link")).toBeUndefined();
  });
});
