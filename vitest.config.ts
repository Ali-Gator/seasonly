import path from "node:path";

import { defineConfig } from "vitest/config";

// One unit run for the whole workspace, in Node. A component test that clicks opts into jsdom
// with `// @vitest-environment jsdom` at its top.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${path.resolve(import.meta.dirname, "apps/web/src")}/` }],
  },
  test: {
    environment: "node",
    // PGlite boots a WASM Postgres per test; two files booting at once can pass 5 s on a laptop.
    testTimeout: 15_000,
    include: [
      "scripts/**/*.test.ts",
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.{ts,tsx}",
    ],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});
