import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "vitest/config";

// The paid smoke run: real model calls, only through `pnpm test:smoke`. Its files end in
// `.smoke.ts`, which neither the unit nor the eval globs match, so a key in the shell never
// turns `pnpm test:unit` into a paid run. Vitest does not read apps/web/.env.local itself.
const envFile = path.resolve(import.meta.dirname, "apps/web/.env.local");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${path.resolve(import.meta.dirname, "apps/web/src")}/` }],
  },
  test: {
    environment: "node",
    include: ["apps/*/src/**/*.smoke.ts"],
    testTimeout: 120_000,
  },
});
