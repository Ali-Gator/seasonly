import path from "node:path";

import { defineConfig } from "vitest/config";

// One unit run for the whole workspace. Node environment: Phase 0 has no component
// tests; add a jsdom project when apps/web gets its first one.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${path.resolve(import.meta.dirname, "apps/web/src")}/` }],
  },
  test: {
    environment: "node",
    include: [
      "scripts/**/*.test.ts",
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.{ts,tsx}",
    ],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});
