/**
 * Records what PostHog receives in an E2E run. The E2E server's PostHog host is the dead
 * 127.0.0.1:9 (playwright.config.ts); routing it answers every request empty and keeps each event.
 * A spec that uses it calls `posingAsAPhone` first: posthog-js drops every event from a likely
 * bot. funnel.spec.ts keeps its own copy (BL-23).
 */
import zlib from "node:zlib";

import { type Page, type Request, test } from "@playwright/test";

const POSTHOG = "http://127.0.0.1:9";

/** A phone's user agent and no `navigator.webdriver`, so posthog-js sends events. */
export function posingAsAPhone() {
  test.use({
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  });
  test.beforeEach(({ page }) =>
    page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
      Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
    }),
  );
}

export interface Captured {
  event: string;
  properties: Record<string, unknown>;
}

/** A body as posthog-js sends it: gzip (by its magic bytes), base64 form data or plain JSON. */
function decode(req: Request): string {
  const url = new URL(req.url());
  const body = req.postDataBuffer() ?? Buffer.alloc(0);
  const compression = url.searchParams.get("compression");
  if (compression === "gzip-js" || (body[0] === 0x1f && body[1] === 0x8b))
    return zlib.gunzipSync(body).toString();
  const text = body.toString();
  if (compression === "base64" || text.startsWith("data="))
    return Buffer.from(new URLSearchParams(text).get("data") ?? "", "base64").toString();
  return text;
}

/** Routes the PostHog host and returns the events it receives, as they arrive. */
export async function recordPostHog(page: Page): Promise<Captured[]> {
  const events: Captured[] = [];
  await page.route(`${POSTHOG}/**`, (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const text = decode(req);
      const parsed = text ? (JSON.parse(text) as unknown) : null;
      const list = Array.isArray(parsed)
        ? parsed
        : ((parsed as { batch?: unknown[] } | null)?.batch ?? [parsed]);
      for (const e of list)
        if (e && typeof e === "object" && "event" in e) events.push(e as Captured);
    }
    return route.fulfill({
      json: {},
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    });
  });
  return events;
}
