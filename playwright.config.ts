import { defineConfig } from "@playwright/test";

// CI builds and serves the app (`pnpm build && pnpm start`); locally, `pnpm dev` compiles on demand.
const PREBUILT = !!process.env.CI;
// Its own port, never a developer's live server.
const PORT = 3100;

// E2E spends nothing and reports nothing, wherever it runs: these win over apps/web/.env.local,
// since Next only fills variables that are undefined, and the build reads them too (BL-11). The
// slot claim then answers `unavailable`, so no model call is made, and the save fails softly.
// PostHog gets a test key on the dead host, which funnel.spec.ts routes to see the events.
// {@link openspec/specs/season-reveal/spec.md#scenario-the-e2e-run-spends-nothing}
const E2E_ENV = {
  PORT: String(PORT),
  SUPABASE_URL: "http://127.0.0.1:9",
  SUPABASE_SECRET_KEY: "",
  AI_GATEWAY_API_KEY: "",
  RESEND_API_KEY: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  // No source-map upload or release from a local E2E build.
  SENTRY_AUTH_TOKEN: "",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_e2e",
  NEXT_PUBLIC_POSTHOG_HOST: "http://127.0.0.1:9",
};

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
    command: PREBUILT ? "pnpm build && pnpm start" : "pnpm dev",
    port: PORT,
    reuseExistingServer: false,
    // The prebuilt command builds first.
    timeout: PREBUILT ? 300_000 : 60_000,
    // The build's log, which CI used to show as its own step.
    stdout: PREBUILT ? "pipe" : "ignore",
    env: E2E_ENV,
  },
});
