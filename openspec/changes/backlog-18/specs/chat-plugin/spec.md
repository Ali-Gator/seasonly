## MODIFIED Requirements

### Requirement: The MCP endpoint is public and lists one tool

`/api/mcp` SHALL serve the Model Context Protocol over Streamable HTTP and SHALL answer requests that carry no credentials. Listing the tools SHALL return exactly one tool, the season quiz tool. Its name SHALL be at most 64 characters, and it SHALL have a human-readable title. Because the tool and its card never change, the endpoint SHALL NOT advertise `listChanged` for tools or resources, and a `subscriptions/listen` request SHALL end at once instead of holding its stream open.

#### Scenario: Listing the tools without credentials

- **WHEN** a client with no credentials initializes a session at `/api/mcp` and lists the tools
- **THEN** exactly one tool is listed, with a name of at most 64 characters and a title

#### Scenario: A subscription request ends at once

- **WHEN** a client sends `/api/mcp` a `subscriptions/listen` request that asks for `toolsListChanged` and `resourcesListChanged`
- **THEN** the response ends without waiting, and neither of the two is honored
