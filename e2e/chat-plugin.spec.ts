import { expect, test } from "@playwright/test";

const HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  "mcp-protocol-version": "2025-06-18",
};

/** The JSON-RPC reply, whether the server answered with JSON or one SSE `message` event. */
function reply(body: string, contentType: string | undefined) {
  const json = contentType?.includes("text/event-stream")
    ? body
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5))
        .join("")
    : body;
  return JSON.parse(json) as {
    result?: {
      tools?: { name: string }[];
      contents?: { text: string }[];
      structuredContent?: unknown;
    };
  };
}

test.describe("chat plugin", () => {
  /** {@link openspec/specs/chat-plugin/spec.md#scenario-listing-the-tools-without-credentials} */
  test("the built server lists the one tool at /api/mcp", async ({ request }) => {
    const init = await request.post("/api/mcp", {
      headers: HEADERS,
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "e2e", version: "1" },
        },
      },
    });
    expect(init.status()).toBe(200);

    const list = await request.post("/api/mcp", {
      headers: HEADERS,
      data: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    });
    expect(list.status()).toBe(200);
    const tools = reply(await list.text(), list.headers()["content-type"]).result?.tools;
    expect(tools).toHaveLength(1);
  });

  /**
   * The card as the production build serves it, minified, in a real browser frame, fed the real
   * tool result by a stand-in host.
   * {@link openspec/specs/chat-plugin/spec.md#scenario-the-card-renders-a-result}
   */
  test("the built card renders the tool result and asks to open the link", async ({
    page,
    request,
  }) => {
    const call = async (id: number, method: string, params: unknown) => {
      const res = await request.post("/api/mcp", {
        headers: HEADERS,
        data: { jsonrpc: "2.0", id, method, params },
      });
      return reply(await res.text(), res.headers()["content-type"]).result;
    };
    const card = (await call(1, "resources/read", { uri: "ui://seasonly/season-card.html" }))
      ?.contents?.[0]?.text;
    const result = await call(2, "tools/call", {
      name: "find_season_family",
      arguments: { veins: "green", jewelry: "gold", sun: "tan", hair: "medium" },
    });
    expect(card).toBeTruthy();

    await page.setContent(
      `<iframe sandbox="allow-scripts" style="width:706px;height:600px;border:0"></iframe>`,
    );
    await page.evaluate(
      ({ card, result }) => {
        const frame = document.querySelector("iframe") as HTMLIFrameElement;
        const w = window as unknown as { opened?: string };
        window.addEventListener("message", (e) => {
          if (e.source !== frame.contentWindow) return;
          const m = e.data;
          const send = (x: object) =>
            frame.contentWindow?.postMessage({ jsonrpc: "2.0", ...x }, "*");
          if (m.method === "ui/initialize")
            send({ id: m.id, result: { hostContext: { theme: "light" } } });
          else if (m.method === "ui/notifications/initialized")
            send({ method: "ui/notifications/tool-result", params: result });
          else if (m.method === "ui/open-link") w.opened = m.params.url;
        });
        frame.srcdoc = card ?? "";
      },
      { card, result },
    );

    const inner = page.frameLocator("iframe");
    await expect(inner.getByText("Autumn", { exact: true })).toBeVisible();
    await expect(inner.locator("li")).toHaveCount(6);
    await inner.getByRole("button", { name: "Get my full analysis" }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { opened?: string }).opened))
      .toBe("https://seasonly.me/analyze?utm_source=chat-plugin&utm_medium=mcp");
  });
});
