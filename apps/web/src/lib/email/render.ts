import { PALETTES, SEASON_COPY, type SeasonSlug, seasonFamily } from "@seasonly/analysis";

import { ORIGIN, seasonName } from "@/lib/site/routes";
import tokens from "@/styles/tokens.json";

/**
 * The report email of canvas artboard 12, as static HTML and plain text. Template strings, not
 * `react-dom/server`: route handlers resolve React's `react-server` build, where it throws.
 * Mail clients ignore classes and most CSS and load no web fonts, so the HTML is tables with
 * inline styles and system font stacks.
 *
 * {@link openspec/specs/email-capture/spec.md#requirement-the-report-email-carries-the-report-link}
 */
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const color = (name: string) => {
  const value = tokens.color.tokens.find((t) => t.name === name)?.value;
  if (!value) throw new Error(`no color token ${name}`);
  return value;
};
const C = {
  paper: color("paper"),
  surface: color("surface"),
  line: color("line"),
  ink: color("ink"),
  muted: color("ink-muted"),
  accent: color("accent"),
  onAccent: color("on-accent"),
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "#39" }[c]};`,
  );

export function renderReportEmail({
  id,
  season,
  quizOnly,
}: {
  id: string;
  season: SeasonSlug;
  quizOnly: boolean;
}): EmailContent {
  const name = seasonName(season);
  const family = seasonFamily(season);
  const familyName = family[0]?.toUpperCase() + family.slice(1);
  const tagline = SEASON_COPY[season].tagline;
  const link = `${ORIGIN}/r/${id}`;
  const shortLink = link.replace(/^https:\/\//, "");
  const colors = PALETTES[season].highlights.slice(0, 4);

  const preview = "30 colors with names and hex codes, plus what to avoid.";
  const heading = "Your color report is ready";
  const intro = `Hi, here's what your ${quizOnly ? "quiz answers" : "selfie and quiz answers"} add up to. You're a ${name}: ${tagline[0]?.toLowerCase()}${tagline.slice(1)}`;
  const body =
    "Your report has all 30 of your colors, the ones to avoid, your best neutrals and metals, and makeup and hair ideas.";
  const footer = [
    ...(quizOnly
      ? []
      : ["Your photo is deleted within 24 hours of your analysis. We keep only your result."]),
    "You got this email because you asked for your report at seasonly.me. We won't email you again unless you ask.",
  ];

  const p = (text: string, style = "") =>
    `<p style="margin:0 0 20px;font:15px/23px ${SANS};color:${C.ink};${style}">${escape(text)}</p>`;
  const chips = colors
    .map(
      (c) =>
        `<td width="25%" valign="top" style="padding:0 6px;"><div style="height:56px;border-radius:6px;background:${c.hex};border:1px solid ${C.line};"></div><p style="margin:8px 0 0;font:13px/18px ${SANS};color:${C.ink};">${escape(c.name)}</p><p style="margin:0;font:500 12px/16px ${SANS};color:${C.muted};">${c.hex.toUpperCase()}</p></td>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(heading)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;">${escape(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${C.surface};border:1px solid ${C.line};border-radius:16px;"><tr><td style="padding:20px;">
<p style="margin:0 0 20px;font:500 22px/22px ${SERIF};color:${C.ink};letter-spacing:-0.02em;">Seasonly</p>
<h1 style="margin:0 0 20px;font:500 28px/34px ${SERIF};color:${C.ink};">${escape(heading)}</h1>
${p(intro)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${C.line};border-radius:999px;"><tr><td style="padding:8px 16px;"><p style="margin:0;font:500 17px/22px ${SERIF};color:${C.ink};">${escape(name)}</p><p style="margin:0;font:12px/16px ${SANS};color:${C.muted};">${escape(familyName)} family</p></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;table-layout:fixed;"><tr>${chips}</tr></table>
${p(body)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="border-radius:999px;background:${C.accent};"><a href="${link}" style="display:inline-block;padding:12px 24px;font:600 15px/20px ${SANS};color:${C.onAccent};text-decoration:none;">Open my report</a></td></tr></table>
<p style="margin:0;font:13px/18px ${SANS};color:${C.muted};">Button not working? Paste this link: <a href="${link}" style="color:${C.ink};">${escape(shortLink)}</a></p>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;"><tr><td style="padding:24px 4px 0;">
${footer.map((line) => `<p style="margin:0 0 8px;font:13px/18px ${SANS};color:${C.muted};">${escape(line)}</p>`).join("\n")}
</td></tr></table>
</td></tr></table>
</body></html>`;

  const text = [
    heading,
    "",
    intro,
    "",
    `${name} (${familyName} family)`,
    ...colors.map((c) => `${c.name} ${c.hex.toUpperCase()}`),
    "",
    body,
    "",
    `Open my report: ${link}`,
    "",
    ...footer,
  ].join("\n");

  return { subject: `Your ${name} color report`, html, text };
}
