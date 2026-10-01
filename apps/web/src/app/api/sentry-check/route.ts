// ponytail: throws on purpose so Phase 0 can prove production errors reach Sentry.
// Delete once the Phase 0 exit check is recorded.
export function GET(): never {
  throw new Error("sentry-check: deliberate Phase 0 probe");
}
