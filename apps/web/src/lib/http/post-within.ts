/**
 * A browser POST with a time limit: the response, or null on a network error or no answer within
 * `ms` (the request is aborted). The email step and the Premium card share it.
 *
 * {@link openspec/specs/email-capture/spec.md#requirement-a-failed-store-keeps-the-person-on-the-step}
 * {@link openspec/specs/interest-button/spec.md#requirement-a-failed-tap-can-be-repeated}
 */
export async function postWithin(
  url: string,
  init: Omit<RequestInit, "method" | "signal">,
  { ms = 10_000, fetch = globalThis.fetch }: { ms?: number; fetch?: typeof globalThis.fetch } = {},
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, method: "POST", signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
