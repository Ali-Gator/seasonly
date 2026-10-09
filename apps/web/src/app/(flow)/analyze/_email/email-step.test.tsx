import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EmailForm, submitEmail } from "./step";

const ID = "k7m2qxAAAAAAAAAAAAAAAA";
const noop = () => {};
const form = (props: Partial<ComponentProps<typeof EmailForm>> = {}) =>
  renderToStaticMarkup(
    <EmailForm
      family="Autumn"
      quizOnly={false}
      value=""
      error={null}
      sending={false}
      failed={false}
      onChange={noop}
      onSubmit={noop}
      {...props}
    />,
  );
const words = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
const items = (html: string) => [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].length;

afterEach(() => {
  vi.useRealTimers();
});

describe("EmailForm", () => {
  /** {@link openspec/specs/email-capture/spec.md#scenario-a-photo-result} */
  it("shows the canvas step for a photo result", () => {
    const out = form();
    const text = words(out);
    expect(text).toContain("Autumn · your full report");
    expect(text).toContain("Get your full report");
    expect(text).toContain("Free for now, while we are in early access.");
    expect(items(out)).toBe(6);
    expect(text).toContain("Your best and worst color, side by side");
    expect(text).toContain("Where should we send your report?");
    expect(text).toContain(
      "We'll email you one link to your report. No newsletter unless you ask.",
    );
    expect(text).toContain("Send my report");
    expect(text).toContain("Your report also opens on the next screen, so you can read it now.");
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-a-quiz-only-result} */
  it("leaves the draping item out for a quiz-only result", () => {
    const out = form({ quizOnly: true });
    expect(items(out)).toBe(5);
    expect(out).not.toContain("side by side");
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-no-skip} */
  it("offers no way to the report but sending the form", () => {
    const out = form();
    expect(out).not.toMatch(/href="\/r\//);
    expect(out.match(/<button/g)).toHaveLength(1);
    expect(out).toMatch(/<button type="submit"/);
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-a-typo} */
  it("shows the field error", () => {
    const text = words(
      form({ value: "maya.reyes@gmail", error: "Enter an email like you@example.com" }),
    );
    expect(text).toContain("Error: Enter an email like you@example.com");
  });

  it("disables Send my report while sending", () => {
    expect(form({ sending: true })).toMatch(/<button type="submit"[^>]* disabled=""/);
    expect(form()).not.toMatch(/<button type="submit"[^>]* disabled=""/);
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-the-database-is-down} */
  it("keeps the address and shows the danger note after a failed send", () => {
    const out = form({ value: "maya.reyes@gmail.com", failed: true });
    expect(out).toContain('value="maya.reyes@gmail.com"');
    expect(out).toContain("sn-note--danger");
    expect(words(out)).toContain(
      "We couldn't send your report Nothing is lost, so you can try again.",
    );
    expect(out).not.toMatch(/disabled=""/);
  });
});

describe("submitEmail", () => {
  /** {@link openspec/specs/email-capture/spec.md#scenario-a-typo} */
  it("sends nothing for a malformed address", async () => {
    const fetch = vi.fn();
    expect(await submitEmail(ID, "maya.reyes@gmail", { fetch })).toEqual({ kind: "invalid" });
    expect(fetch).not.toHaveBeenCalled();
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-a-valid-address} */
  it("posts the lowercased address and opens the report on 200", async () => {
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    expect(await submitEmail(ID, " Maya.Reyes@Gmail.com ", { fetch })).toEqual({
      kind: "open",
      href: `/r/${ID}`,
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/reports/${ID}/email`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ email: "maya.reyes@gmail.com" });
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-fourth-address} */
  it("opens the report on 429 too", async () => {
    const fetch = vi.fn(async () => Response.json({}, { status: 429 }));
    expect(await submitEmail(ID, "maya@example.com", { fetch })).toEqual({
      kind: "open",
      href: `/r/${ID}`,
    });
  });

  /** {@link openspec/specs/email-capture/spec.md#requirement-a-failed-store-keeps-the-person-on-the-step} */
  it("fails on a server error, a network error and no answer within 10 s", async () => {
    expect(
      await submitEmail(ID, "maya@example.com", {
        fetch: async () => Response.json({}, { status: 500 }),
      }),
    ).toEqual({ kind: "failed" });
    expect(
      await submitEmail(ID, "maya@example.com", {
        fetch: () => Promise.reject(new TypeError("offline")),
      }),
    ).toEqual({ kind: "failed" });

    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = submitEmail(ID, "maya@example.com", {
      fetch: (_url, init) => {
        signal = init?.signal ?? undefined;
        return new Promise((_, reject) =>
          signal?.addEventListener("abort", () => reject(new DOMException("", "AbortError"))),
        );
      },
    });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await pending).toEqual({ kind: "failed" });
    expect(signal?.aborted).toBe(true);
  });
});
