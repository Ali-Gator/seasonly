import { withSentryConfig } from "@sentry/nextjs/config";
import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

import { SEASON_ALIASES } from "./src/lib/site/routes";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The analysis core ships as TypeScript source.
  transpilePackages: ["@seasonly/analysis"],
  // permanent: true answers 308, at the edge with no page render.
  async redirects() {
    return Object.entries(SEASON_ALIASES).map(([alias, slug]) => ({
      source: `/seasons/${alias}`,
      destination: `/seasons/${slug}`,
      permanent: true,
    }));
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN is set; without it the build still passes.
export default withSentryConfig(withBotId(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
});
