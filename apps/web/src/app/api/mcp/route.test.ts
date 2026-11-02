/**
 * The MCP route, driven with JSON-RPC `Request`s the way a chat host sends them: a 2025-era
 * client on stateless Streamable HTTP, with no credentials.
 *
 * @see openspec/specs/chat-plugin/spec.md
 */
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import { POST } from "./route";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  createTransport: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

const PROTOCOL = "2025-06-18";
let nextId = 1;
let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch");
});
afterEach(() => vi.restoreAllMocks());

interface RpcReply {
  result?: Record<string, unknown> & {
    tools?: Tool[];
    contents?: Content[];
    structuredContent?: unknown;
    content?: { type: string; text: string }[];
    isError?: boolean;
  };
  error?: { code: number; message: string; data?: unknown };
}
interface Tool {
  name: string;
  title?: string;
  description?: string;
  annotations?: Record<string, unknown>;
  _meta?: { ui?: { resourceUri?: string } } & Record<string, unknown>;
}
interface Content {
  uri: string;
  mimeType: string;
  text: string;
  _meta?: { ui?: { csp?: Record<string, string[] | undefined> } };
}

/** One JSON-RPC call, the reply read as JSON or as the one SSE `message` event. */
async function rpc(method: string, params: unknown = {}): Promise<RpcReply & { res: Response }> {
  const res = await POST(
    new Request("https://seasonly.me/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": PROTOCOL,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    }),
  );
  const body = await res.text();
  const json = res.headers.get("content-type")?.includes("text/event-stream")
    ? body
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5))
        .join("")
    : body;
  return { res, ...(JSON.parse(json) as RpcReply) };
}

async function initialize() {
  return rpc("initialize", {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  });
}

/** The one listed tool. */
async function theTool(): Promise<Tool> {
  await initialize();
  const [tool] = (await rpc("tools/list")).result?.tools ?? [];
  if (!tool) throw new Error("no tool listed");
  return tool;
}

/** The call's refusal text: a JSON-RPC error or a tool result flagged `isError`. */
function refusal(reply: RpcReply): string {
  if (reply.error) return JSON.stringify(reply.error);
  expect(reply.result?.isError).toBe(true);
  return JSON.stringify(reply.result);
}

/** The whole body, or a throw naming what was sent when the stream is still open after `ms`. */
async function bodyWithin(res: Response, ms: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("no response body");
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, ms);
  const decoder = new TextDecoder();
  let body = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    body += decoder.decode(value, { stream: true });
  }
  clearTimeout(timer);
  if (timedOut) throw new Error(`stream still open after ${ms} ms, sent: ${body}`);
  return body;
}

describe("/api/mcp", () => {
  /** {@link openspec/specs/chat-plugin/spec.md#scenario-listing-the-tools-without-credentials} */
  it("lists one titled tool to a client with no credentials", async () => {
    const init = await initialize();
    expect(init.res.status).toBe(200);
    const tools = (await rpc("tools/list")).result?.tools ?? [];
    expect(tools).toHaveLength(1);
    expect(tools[0]?.name.length).toBeLessThanOrEqual(64);
    expect(tools[0]?.title).toBeTruthy();
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-the-annotations} */
  it("annotates the tool read-only, explicitly", async () => {
    const tool = await theTool();
    expect(tool.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-the-title-annotation} */
  it("repeats the tool's title as its title annotation", async () => {
    const tool = await theTool();
    expect(tool.title).toBeTruthy();
    expect(tool.annotations?.title).toBe(tool.title);
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-no-outside-origin} */
  it("links an MCP Apps card whose CSP allows no outside origin", async () => {
    const tool = await theTool();
    const uri = tool._meta?.ui?.resourceUri;
    expect(uri).toMatch(/^ui:\/\//);
    expect(tool._meta?.["openai/outputTemplate"]).toBe(uri);

    const content = (await rpc("resources/read", { uri })).result?.contents?.[0];
    expect(content?.mimeType).toBe("text/html;profile=mcp-app");
    expect(content?.text).toContain("<html");
    const csp = content?._meta?.ui?.csp ?? {};
    expect(csp.connectDomains ?? []).toEqual([]);
    expect(csp.resourceDomains ?? []).toEqual([]);
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-parity-with-the-web-quiz} */
  it("answers valid answers with structured content and text", async () => {
    const tool = await theTool();
    const reply = await rpc("tools/call", {
      name: tool.name,
      arguments: { veins: "green", jewelry: "gold", sun: "tan", hair: "medium" },
    });
    expect(reply.error).toBeUndefined();
    expect(reply.result?.isError).toBeFalsy();
    expect(reply.result?.structuredContent).toMatchObject({ kind: "season" });
    expect(reply.result?.content?.[0]).toMatchObject({ type: "text" });
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-every-answer-unsure} */
  it("answers a no-result as a normal result", async () => {
    const tool = await theTool();
    const reply = await rpc("tools/call", { name: tool.name, arguments: {} });
    expect(reply.error).toBeUndefined();
    expect(reply.result?.isError).toBeFalsy();
    expect(reply.result?.structuredContent).toMatchObject({ kind: "no-result" });
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-an-unknown-value} */
  it("refuses an unknown value, naming the field", async () => {
    const tool = await theTool();
    const reply = await rpc("tools/call", { name: tool.name, arguments: { veins: "purple" } });
    expect(refusal(reply)).toContain("veins");
    expect(reply.result?.structuredContent).toBeUndefined();
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-an-unknown-field} */
  it("refuses an unknown field, naming it", async () => {
    const tool = await theTool();
    const reply = await rpc("tools/call", { name: tool.name, arguments: { photo: "data:..." } });
    expect(refusal(reply)).toContain("photo");
    expect(reply.result?.structuredContent).toBeUndefined();
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-a-tool-call-makes-no-outbound-request} */
  it("makes no outbound request and sets no cookie", async () => {
    const tool = await theTool();
    const reply = await rpc("tools/call", {
      name: tool.name,
      arguments: { veins: "blue", jewelry: "silver", sun: "burn", hair: "dark" },
    });
    expect(reply.result?.structuredContent).toMatchObject({ kind: "season" });
    expect(reply.res.headers.get("set-cookie")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/chat-plugin/spec.md#scenario-a-subscription-request-ends-at-once} */
  it("ends a 2026-07-28 subscription request at once, honoring neither flag", async () => {
    const revision = "2026-07-28";
    const res = await POST(
      new Request("https://seasonly.me/api/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": revision,
          "mcp-method": "subscriptions/listen",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: nextId++,
          method: "subscriptions/listen",
          params: {
            _meta: {
              "io.modelcontextprotocol/protocolVersion": revision,
              "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" },
              "io.modelcontextprotocol/clientCapabilities": {},
            },
            notifications: { toolsListChanged: true, resourcesListChanged: true },
          },
        }),
      }),
    );
    expect(res.status).toBe(200);

    const messages = (await bodyWithin(res, 1000))
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => JSON.parse(l.slice(5)) as RpcReply & { params?: unknown });
    expect(messages[0]?.params).toMatchObject({ notifications: {} });
    expect(messages[0]?.params).not.toHaveProperty("notifications.toolsListChanged");
    expect(messages[0]?.params).not.toHaveProperty("notifications.resourcesListChanged");
    expect(messages.at(-1)?.result?.resultType).toBe("complete");
  });
});
