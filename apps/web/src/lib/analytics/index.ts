import posthog, { type BeforeSendFn, type Properties } from "posthog-js";

/**
 * PostHog events from the browser, where every outcome is known. With no key (initPostHog never
 * ran) `track` sends nothing and every step works the same.
 *
 * @see openspec/specs/analytics/spec.md
 */
export function track(name: string, props: Record<string, unknown>): void {
  if (!posthog.__loaded) return;
  posthog.capture(name, props);
}

/**
 * A path that carries a report id: the report page, the face image (`attr__src` of a rage click)
 * and the report's API routes. The id is REPORT_ID's class (`lib/draping/crops.ts`, which imports
 * the server client), exactly 22 characters and not followed by another; a test pins the two.
 * ponytail: an encoded id (`%2Fr%2F…`) passes; nothing on the site writes one.
 */
const REPORT_PATH = /\/(r|api\/face|api\/reports)\/[A-Za-z0-9_-]{22}(?![A-Za-z0-9_-])/g;

const isPlain = (value: object) => [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Every string in `value`, object keys included (`$heatmap_data` is keyed by URL), masked. */
function mask(value: unknown): unknown {
  if (typeof value === "string") return value.replace(REPORT_PATH, "/$1/:id");
  if (Array.isArray(value)) return value.map(mask);
  if (value && typeof value === "object" && isPlain(value))
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [mask(k), mask(v)]));
  return value;
}

/**
 * PostHog's `before_send`: every `/r/<id>` in an event's properties, nested ones included,
 * becomes `/r/:id` (and `/api/face/<id>` `/api/face/:id`) before it leaves the browser.
 *
 * {@link openspec/specs/analytics/spec.md#requirement-no-report-id-reaches-posthog}
 */
export const maskReportIds: BeforeSendFn = (event) => {
  if (!event) return null;
  const masked = { ...event };
  for (const key of ["properties", "$set", "$set_once"] as const)
    if (masked[key]) masked[key] = mask(masked[key]) as Properties;
  return masked;
};
