/**
 * The funnel's events as PostHog receives them. The E2E server has a test key whose host is the
 * dead 127.0.0.1:9 (playwright.config.ts); here that host is routed, so every capture request is
 * recorded and decoded. The analyze and email routes are answered by `page.route`; the report id
 * is well-formed, so /r/<it> is a real report path and lands on the read-failure page.
 *
 * @see openspec/specs/analytics/spec.md
 */
import path from "node:path";
import zlib from "node:zlib";

import { expect, type Page, type Request, test } from "@playwright/test";

const FACE = path.resolve(import.meta.dirname, "fixtures/face.jpg");
const ID = "e2eFunnelReport0000000";
const ADDRESS = "funnel.e2e@example.com";
const POSTHOG = "http://127.0.0.1:9";
/** The events the funnel names; others (`$pageleave`, `$autocapture`, …) are not counted. */
const NAMED = new Set([
  "$pageview",
  "photo_checked",
  "consent_answered",
  "quiz_completed",
  "analysis_result",
  "analysis_failed",
  "report_requested",
  "email_submitted",
]);

test.use({
  viewport: { width: 390, height: 844 },
  // posthog-js drops every event from a likely bot: a HeadlessChrome user agent, its brands or
  // `navigator.webdriver` (cleared below).
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
});

test.beforeEach(({ page }) =>
  page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  }),
);

interface Captured {
  event: string;
  properties: Record<string, unknown>;
  timestamp?: string;
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

/** Routes the PostHog host: every request answered empty, every body kept. */
async function recordPostHog(page: Page) {
  const bodies: string[] = [];
  const events: Captured[] = [];
  const errors: string[] = [];
  await page.route(`${POSTHOG}/**`, (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      try {
        const text = decode(req);
        bodies.push(`${req.url()} ${text}`);
        const parsed = text ? (JSON.parse(text) as unknown) : null;
        const list = Array.isArray(parsed)
          ? parsed
          : ((parsed as { batch?: unknown[] } | null)?.batch ?? [parsed]);
        for (const e of list)
          if (e && typeof e === "object" && "event" in e) events.push(e as Captured);
      } catch (error) {
        errors.push(`${req.url()} ${req.headers()["content-type"]}: ${String(error)}`);
      }
    } else bodies.push(req.url());
    return route.fulfill({
      json: {},
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    });
  });
  /** The named events in the order they happened, a page view as `$pageview <path>`. */
  const named = () =>
    events
      .filter((e) => NAMED.has(e.event))
      .toSorted((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""))
      .map((e) =>
        e.event === "$pageview" ? `$pageview ${String(e.properties.$pathname)}` : e.event,
      );
  const find = (name: string) => events.filter((e) => e.event === name);
  return { bodies, events, errors, named, find };
}

/** The analyze route answers a result with `ID`, a 500, or never (`hold`). */
async function answerAnalyze(page: Page, answer: "result" | 500 | "hold") {
  await page.route("**/api/analyze", (route) => {
    if (answer === 500) return route.fulfill({ status: 500, body: "" });
    if (answer === "hold") return;
    return route.fulfill({
      json: {
        kind: "result",
        reportId: ID,
        season: "soft-autumn",
        agreement: "agree",
        confidence: 0.6,
        photo: "ok",
        text: "personal",
      },
    });
  });
}

async function uploadFace(page: Page, label = "Upload a photo") {
  const upload = page.getByLabel(label);
  await expect(upload).toBeEnabled();
  await upload.setInputFiles(FACE);
}

async function answerQuiz(page: Page) {
  const answers = ["Green or olive", "Gold", "Tans easily, rarely burns", "Medium or light brown"];
  for (const [i, label] of answers.entries()) {
    await expect(page.getByText(`Question ${i + 1} of 4`)).toBeVisible();
    await page.getByText(label, { exact: true }).click();
    if (i < 3) await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByRole("button", { name: "See my result" }).click();
}

const POLL = { timeout: 20_000 };

/**
 * {@link openspec/specs/analytics/spec.md#scenario-from-landing-to-the-report}
 * {@link openspec/specs/analytics/spec.md#scenario-a-page-view-of-a-report}
 * {@link openspec/specs/analytics/spec.md#scenario-a-valid-address}
 * {@link openspec/specs/analytics/spec.md#scenario-after-the-email-step}
 */
test("sends one event per funnel step, from the landing to the report", async ({ page }) => {
  test.setTimeout(90_000);
  const posthog = await recordPostHog(page);
  await answerAnalyze(page, "result");
  await page.route("**/api/reports/*/email", (route) => route.fulfill({ json: { ok: true } }));

  await page.goto("/");
  await page.getByRole("link", { name: "Find my colors" }).click();
  await uploadFace(page);
  await page.getByRole("button", { name: "Agree and upload" }).click();
  await answerQuiz(page);
  await page.getByRole("button", { name: "Get my full report" }).click();
  await page.getByLabel("Where should we send your report?").fill(ADDRESS);
  await page.getByRole("button", { name: "Send my report" }).click();
  await page.waitForURL(`**/r/${ID}`);
  await expect(page.getByRole("heading", { name: "We couldn't open your report" })).toBeVisible();

  await expect
    .poll(posthog.named, POLL)
    .toEqual([
      "$pageview /",
      "$pageview /analyze",
      "photo_checked",
      "consent_answered",
      "quiz_completed",
      "analysis_result",
      "report_requested",
      "email_submitted",
      "$pageview /r/:id",
    ]);
  expect(posthog.errors).toEqual([]);
  expect(posthog.find("consent_answered")[0]?.properties).toMatchObject({ agreed: true });
  expect(posthog.find("quiz_completed")[0]?.properties).toMatchObject({ quiz_only: false });
  expect(posthog.find("report_requested")[0]?.properties).toMatchObject({ quiz_only: false });
  expect(posthog.find("$pageview").at(-1)?.properties.$current_url).toBe(
    "http://localhost:3100/r/:id",
  );
  // Nothing PostHog received, flags and config requests included, holds the id or the address.
  const sent = posthog.bodies.join("\n");
  expect(sent).not.toContain(ID);
  expect(sent).not.toContain("funnel.e2e");
  expect(new Set(posthog.events.map((e) => e.properties.distinct_id)).size).toBe(1);
  expect(posthog.events.map((e) => e.event)).not.toContain("$identify");
  expect(posthog.events.map((e) => e.event)).not.toContain("$set");
});

/**
 * {@link openspec/specs/analytics/spec.md#scenario-declining-consent}
 * {@link openspec/specs/analytics/spec.md#scenario-back-to-a-step-already-seen}
 */
test("sends a declined consent, and a second report_requested after Back", async ({ page }) => {
  test.setTimeout(90_000);
  const posthog = await recordPostHog(page);
  await answerAnalyze(page, "result");

  await page.goto("/analyze");
  await uploadFace(page);
  await page.getByRole("button", { name: "Not now, go back" }).click();
  await uploadFace(page, "Upload a photo instead");
  await page.getByRole("button", { name: "Agree and upload" }).click();
  await answerQuiz(page);
  await page.getByRole("button", { name: "Get my full report" }).click();
  await expect(page.getByRole("heading", { name: "Get your full report" })).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: "Get my full report" }).click();
  await expect(page.getByRole("heading", { name: "Get your full report" })).toBeVisible();

  await expect
    .poll(posthog.named, POLL)
    .toEqual([
      "$pageview /analyze",
      "photo_checked",
      "consent_answered",
      "photo_checked",
      "consent_answered",
      "quiz_completed",
      "analysis_result",
      "report_requested",
      "report_requested",
    ]);
  expect(posthog.find("consent_answered").map((e) => e.properties.agreed)).toEqual([false, true]);
});

/** {@link openspec/specs/analytics/spec.md#scenario-the-analysis-times-out} */
test("sends one analysis_failed when the analysis fails", async ({ page }) => {
  test.setTimeout(90_000);
  const posthog = await recordPostHog(page);
  await answerAnalyze(page, 500);

  await page.goto("/analyze");
  await uploadFace(page);
  await page.getByRole("button", { name: "Agree and upload" }).click();
  await answerQuiz(page);
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

  await expect.poll(posthog.named, POLL).toContain("analysis_failed");
  expect(posthog.find("analysis_failed")).toHaveLength(1);
  expect(posthog.find("analysis_failed")[0]?.properties).toMatchObject({ quiz_only: false });
});

/** {@link openspec/specs/analytics/spec.md#scenario-back-while-analyzing} */
test("sends no analysis_failed when the person goes Back while analyzing", async ({ page }) => {
  test.setTimeout(90_000);
  const posthog = await recordPostHog(page);
  await answerAnalyze(page, "hold");

  await page.goto("/analyze");
  await uploadFace(page);
  await page.getByRole("button", { name: "Agree and upload" }).click();
  await answerQuiz(page);
  await expect(page.getByText("Question 4 of 4")).toBeHidden();
  await page.goBack();
  await expect(page.getByText("Question 4 of 4")).toBeVisible();
  // The landing's page view is queued after anything Back sent, so its arrival is the sign.
  await page.getByRole("link", { name: "Seasonly" }).click();

  await expect.poll(posthog.named, POLL).toContain("$pageview /");
  expect(posthog.find("analysis_failed")).toEqual([]);
});
