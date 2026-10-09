import { z } from "zod";

/**
 * The one address check the email step and the route share: spaces dropped, lowercased, then
 * `local@domain.tld` of at most 254 characters. No server imports.
 *
 * {@link openspec/specs/email-capture/spec.md#requirement-a-malformed-address-is-refused-before-anything-is-sent}
 */
export const EMAIL_ERROR = "Enter an email like you@example.com";

const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/);

/** The normalized address, or null when it is malformed. */
export function parseEmail(value: unknown): string | null {
  const parsed = EmailSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
