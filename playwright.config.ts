import { defineConfig } from "@playwright/test";

// CI runs a prebuilt server (`pnpm start`); locally, `pnpm dev` compiles on demand.
const PREBUILT = !!process.env.CI;
// Its own port, never a developer's live server.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: PREBUILT,
  retries: PREBUILT ? 0 : 1,
  reporter: PREBUILT ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: PREBUILT ? "retain-on-failure" : "off",
  },
  webServer: {
    command: PREBUILT ? "pnpm start" : "pnpm dev",
    port: PORT,
    reuseExistingServer: false,
    // E2E spends nothing, wherever it runs: these win over apps/web/.env.local, since Next only
    // fills variables that are undefined. The slot claim then answers `unavailable`, so no model
    // call is made, and the save fails softly.
    // {@link openspec/specs/season-reveal/spec.md#scenario-the-e2e-run-spends-nothing}
    env: {
      PORT: String(PORT),
      SUPABASE_URL: "http://127.0.0.1:9",
      SUPABASE_SECRET_KEY: "",
      AI_GATEWAY_API_KEY: "",
      RESEND_API_KEY: "",
      NEXT_PUBLIC_SENTRY_DSN: "",
      NEXT_PUBLIC_POSTHOG_KEY: "",
    },
  },
});
