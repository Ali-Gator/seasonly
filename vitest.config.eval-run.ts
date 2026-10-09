import path from "node:path";

import { defineConfig } from "vitest/config";

// The local eval run, `pnpm eval:run`: fetches the photos, runs MediaPipe in Chromium on any
// photo not yet cached, then the core in Node, and writes evals/results.json. Its files end in
// `.run.ts`, which no other config matches, so CI never needs the photos.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${path.resolve(import.meta.dirname, "apps/web/src")}/` }],
  },
  test: {
    environment: "node",
    include: ["evals/**/*.run.ts"],
    // A first run downloads the photos and the models and extracts every photo in the browser.
    testTimeout: 30 * 60_000,
  },
});
