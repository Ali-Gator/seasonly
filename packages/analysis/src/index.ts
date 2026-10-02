/**
 * The analysis core: the photo check, color sampling, the 12-season classifier and the season palettes.
 * Every surface (web flow, server routes, the plugin) calls these.
 *
 * @see openspec/specs/architecture-boundaries/spec.md
 */
export * from "./classifier/index.ts";
export * from "./palettes/index.ts";
export * from "./photo-check/index.ts";
export * from "./sampling/index.ts";
