import { defineConfig } from "@playwright/test";

// CI runs a prebuilt server (`pnpm start`); locally, `pnpm dev` compiles on demand.
const PREBUILT = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: PREBUILT,
  retries: PREBUILT ? 0 : 1,
  reporter: PREBUILT ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: PREBUILT ? "retain-on-failure" : "off",
  },
  webServer: {
    command: PREBUILT ? "pnpm start" : "pnpm dev",
    port: 3000,
    reuseExistingServer: !PREBUILT,
  },
});
