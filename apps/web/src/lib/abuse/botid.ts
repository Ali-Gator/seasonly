/**
 * The requests the browser attaches BotID's challenge to. A `*` matches any characters, so the
 * email route is protected for every report id.
 *
 * {@link openspec/specs/abuse-controls/spec.md#requirement-bots-are-refused-on-the-analyze-route}
 * {@link openspec/specs/abuse-controls/spec.md#requirement-bots-are-refused-on-the-report-email-route}
 */
export const BOTID_PROTECT = [
  { path: "/api/analyze", method: "POST" },
  { path: "/api/reports/*/email", method: "POST" },
];
