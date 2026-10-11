## Why

The Claude Connectors Directory's tool check flags `find_season_family`: "Missing title annotation. Add annotations.title, a human-readable name for the directory listing." The tool sets only the top-level `title`. BL-36 logged it at submission on 2026-10-11.

## What Changes

- The tool's annotations gain `title: "Find my season family"`, the same words as its top-level `title`.
- **Folded in from `docs/backlog.md`:** BL-36 is deleted when this change ships.

## Capabilities

### Modified Capabilities

- `chat-plugin`: the tool is annotated with a title as well as the three hints.

## Impact

`apps/web/src/lib/mcp/server.ts` (one line) and a new unit test in `apps/web/src/app/api/mcp/route.test.ts`. The listing already in review reads tools live, so the next directory scan sees it; nothing to resubmit.
