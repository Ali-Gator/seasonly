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
  return JSON.parse(json) as { result?: { tools?: { name: string }[] } };
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
});
