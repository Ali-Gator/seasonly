import { createMcpHandler } from "mcp-handler";

import { registerSeasonly } from "@/lib/mcp/server";
import { withErrorCapture } from "@/lib/observability/with-error-capture";

const handler = createMcpHandler(registerSeasonly, {
  serverInfo: { name: "Seasonly", version: "1.0.0" },
});

/**
 * The chat plugin's MCP endpoint: stateless Streamable HTTP, no credentials, nothing stored.
 * Next answers `GET` and `DELETE` with 405, as a stateless server does.
 *
 * {@link openspec/specs/chat-plugin/spec.md#requirement-the-mcp-endpoint-is-public-and-lists-one-tool}
 * {@link openspec/specs/chat-plugin/spec.md#requirement-the-plugin-stores-nothing-and-tracks-no-one}
 */
export const POST = withErrorCapture(handler);
