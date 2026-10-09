import * as Sentry from "@sentry/nextjs";

export type Timed<T> = { ok: true; value: T } | { ok: false };

/**
 * Runs one outside call with a time limit. A rejection, or no answer within `ms`, is captured as
 * `new Error(label, { cause })` with `extra` (a report id, never an address), flushed for 2 s and
 * answered `{ ok: false }`; the signal `run` gets is aborted at the limit. Never throws.
 *
 * {@link openspec/specs/email-capture/spec.md#requirement-a-failed-store-keeps-the-person-on-the-step}
 */
export async function withTimeout<T>(
  label: string,
  run: (signal: AbortSignal) => PromiseLike<T>,
  { ms = 3000, extra }: { ms?: number; extra?: Record<string, unknown> } = {},
): Promise<Timed<T>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timed out after ${ms / 1000} s`));
    }, ms);
  });
  try {
    return { ok: true, value: await Promise.race([run(controller.signal), timeout]) };
  } catch (cause) {
    const error = new Error(label, { cause: cause ?? new Error(`${label}: no error given`) });
    if (extra) Sentry.captureException(error, { extra });
    else Sentry.captureException(error);
    await Sentry.flush(2000);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
