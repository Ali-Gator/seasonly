/**
 * The requests the browser attaches BotID's challenge to.
 *
 * {@link openspec/specs/abuse-controls/spec.md#requirement-bots-are-refused-on-the-analyze-route}
 */
export const BOTID_PROTECT = [{ path: "/api/analyze", method: "POST" }];
