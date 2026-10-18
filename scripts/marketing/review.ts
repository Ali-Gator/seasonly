/**
 * Launch plan step 6: writes the review page for one batch of posts into the git-ignored
 * `marketing/out/review.html`, plus `review-files.json`, the media map the Artifact publish takes.
 *
 *   node scripts/marketing/review.ts
 *
 * Captions follow the Content tab: the demo line first on every post with a generated face, then
 * the format's caption, then the platform's call to action and hashtags. Edit `BATCH` for the next
 * batch (step 10). Free: no paid call.
 */
import fs from "node:fs";
import path from "node:path";

import { SEASON_SLUGS, type SeasonSlug } from "../../packages/analysis/src/index.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "marketing/out");

interface Video {
  id: string;
  hook: number;
  text: string;
  generated: boolean;
}
const VIDEOS: Video[] = JSON.parse(fs.readFileSync(path.join(OUT, "videos/videos.json"), "utf8"));

const DEMO = "Demo of seasonly.me with an AI-generated model.";
const CAPTION = {
  draping:
    "Your best and worst color, side by side. Seasonly puts your face crop on both so you can see the difference yourself. One selfie, four questions, under a minute.",
  season:
    "12 seasons, one is yours. A daylight selfie and four quick questions (veins, jewelry, sun, natural hair) find it. Free while in early access.",
  palette:
    "30 colors that work with you, each named, with its hex code, plus colors to avoid, neutrals, metals and makeup ideas.",
  myth: "A bad photo gives a bad result. Seasonly checks yours first (light and color cast) and tells you how to retake it. Your photo is deleted within 24 hours.",
  gpt: "OpenAI retires custom GPTs on December 11, 2026, color analysis GPTs among them. Seasonly finds your season from one selfie, with a photo check and a draping preview.",
};

/** Per video: its caption, the season it shows (for the season hashtag), and why it differs from the pack. */
const VIDEO_COPY: Record<string, { caption: string; season?: SeasonSlug; changed?: string }> = {
  "01-draping-same-face": { caption: CAPTION.draping, season: "soft-summer" },
  "02-draping-worst-first": { caption: CAPTION.draping, season: "soft-autumn" },
  "03-veins": { caption: CAPTION.season },
  "04-soft-autumn-palette": { caption: CAPTION.palette, season: "soft-autumn" },
  "05-twelve-palettes": { caption: CAPTION.palette },
  "06-wear-skip": { caption: CAPTION.palette, season: "true-winter" },
  "07-filter-changes-season": {
    caption:
      "Same face, two selfies: one with a beauty filter, one without. The filter moved her result from Deep Autumn to Light Summer. Take yours in daylight, no filter.",
    changed:
      "New caption: the pack's Myth-busting caption says the photo check catches color cast, and this filter passes it (BL-95).",
  },
  "08-indoor-light": { caption: CAPTION.myth, season: "deep-autumn" },
  "09-jet-black": {
    caption:
      "Jet Black is on the avoid list of 5 of the 12 seasons: Light and True Spring, Light and Soft Summer, and Soft Autumn. Every palette names 30 colors that work with you, plus the ones to skip.",
    changed: "New caption: the pack's Myth-busting caption is about photo checks, not this video.",
  },
  "10-gpt-retires": { caption: CAPTION.gpt, season: "deep-winter" },
};

/** Batch 1: Sun Oct 18 to Tue Oct 27, 18:00 US Eastern (EDT). Instagram alternates Reel and carousel. */
const BATCH = {
  name: "Batch 1",
  days: [
    ["2026-10-18", "01-draping-same-face", "reel", "soft-summer"],
    ["2026-10-19", "05-twelve-palettes", "soft-autumn", "soft-autumn"],
    ["2026-10-20", "07-filter-changes-season", "reel", "deep-winter"],
    ["2026-10-21", "03-veins", "true-winter", "true-winter"],
    ["2026-10-22", "10-gpt-retires", "reel", "light-summer"],
    ["2026-10-23", "02-draping-worst-first", "deep-autumn", "deep-autumn"],
    ["2026-10-24", "04-soft-autumn-palette", "reel", "true-autumn"],
    ["2026-10-25", "08-indoor-light", "light-spring", "light-spring"],
    ["2026-10-26", "06-wear-skip", "reel", "bright-spring"],
    ["2026-10-27", "09-jet-black", "true-summer", "true-summer"],
  ] as [string, string, "reel" | SeasonSlug, SeasonSlug][],
};

const seasonName = (slug: string) =>
  slug.replace(/(^|-)(\w)/g, (_, dash: string, c: string) => (dash ? " " : "") + c.toUpperCase());
const tag = (slug?: string) => (slug ? ` #${slug.replace("-", "")}` : "");
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Platform = "TikTok" | "Instagram" | "YouTube Shorts" | "Pinterest";
interface Post {
  id: string;
  platform: Platform;
  kind: string;
  title?: string;
  caption: string;
  link?: string;
  aiLabel: boolean;
  note?: string;
}

const IG_NO_LABEL =
  "Scheduled without Instagram's AI label: Meta Business Suite has no switch for it. The first caption line and the on-video badge say AI-generated model.";

const files = new Map<string, string>();
const use = (file: string) => (files.set(file, path.join("marketing/out", file)), file);

function videoPosts(v: Video, n: string, reel: boolean): Post[] {
  const c = VIDEO_COPY[v.id];
  if (!c) throw new Error(`no copy for ${v.id}`);
  const body = `${v.generated ? `${DEMO}\n\n` : ""}${c.caption}`;
  const base = { aiLabel: v.generated, note: c.changed };
  const posts: Post[] = [
    {
      ...base,
      id: `TT-${n}`,
      platform: "TikTok",
      kind: "Video",
      caption: `${body}\n\nType seasonly.me in your browser.\n\n#coloranalysis #seasonalcoloranalysis #colorseason #whatseasonami${tag(c.season)}`,
    },
    {
      ...base,
      id: `YT-${n}`,
      platform: "YouTube Shorts",
      kind: "Short",
      title: v.text,
      caption: `${body}\n\nFind yours at seasonly.me, link on the channel page.\n\n#coloranalysis #colorseason #shorts`,
    },
  ];
  if (reel)
    posts.splice(1, 0, {
      ...base,
      id: `IG-${n}`,
      platform: "Instagram",
      kind: "Reel",
      caption: `${body}\n\nLink in bio.\n\n#coloranalysis #seasonalcoloranalysis #colorpalette #colorseason${tag(c.season)}`,
      // Meta Business Suite schedules Reels but has no AI-label switch; the caption and on-video badge disclose it.
      aiLabel: false,
      note: [c.changed, v.generated && IG_NO_LABEL].filter(Boolean).join(" ") || undefined,
    });
  return posts;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T22:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });

const caption = (p: Post) => `
  <article class="post" id="${p.id}">
    <header><span class="pid">${p.id}</span><span class="plat">${p.platform}</span><span class="kind">${p.kind}</span>${
      p.aiLabel
        ? `<span class="chip ai">AI label on</span>`
        : `<span class="chip">No AI label</span>`
    }</header>
    ${p.title ? `<p class="title"><span>Title</span>${esc(p.title)}</p>` : ""}
    <pre class="cap">${esc(p.caption)}</pre>
    ${p.link ? `<p class="link"><span>Link</span><a href="${esc(p.link)}">${esc(p.link)}</a></p>` : ""}
    ${p.note ? `<p class="note">${esc(p.note)}</p>` : ""}
  </article>`;

let count = 0;
const changed: string[] = [];
const sections = BATCH.days.map(([date, videoId, ig, pinSlug], i) => {
  const n = String(i + 1).padStart(2, "0");
  const v = VIDEOS.find((x) => x.id === videoId);
  if (!v) throw new Error(`no video ${videoId}`);
  if (!SEASON_SLUGS.includes(pinSlug)) throw new Error(`no season ${pinSlug}`);
  const vp = videoPosts(v, n, ig === "reel");
  if (VIDEO_COPY[videoId]?.changed) changed.push(...vp.map((p) => p.id));
  const units = [
    `<div class="unit"><div class="media"><video src="${use(`videos/${v.id}.mp4`)}" controls muted playsinline preload="metadata"></video></div>
      <div class="posts">${vp.map(caption).join("")}</div></div>`,
  ];
  count += vp.length;
  if (ig !== "reel") {
    const slides = [1, 2, 3, 4, 5, 6, 7].map((s) => use(`carousels/${ig}/${s}.png`));
    units.push(`<div class="unit carousel"><div class="strip" tabindex="0" aria-label="${seasonName(ig)} carousel, 7 slides">${slides
      .map(
        (s, k) => `<img src="${s}" alt="${seasonName(ig)} carousel slide ${k + 1}" loading="lazy">`,
      )
      .join("")}</div>
      <div class="posts">${caption({
        id: `IG-${n}`,
        platform: "Instagram",
        kind: "Carousel, 7 slides",
        aiLabel: false,
        caption: `The ${seasonName(ig)} palette. ${CAPTION.palette}\n\nLink in bio.\n\n#coloranalysis #seasonalcoloranalysis #colorpalette #colorseason${tag(ig)}`,
      })}</div></div>`);
    count++;
  }
  units.push(`<div class="unit"><div class="media pin"><img src="${use(`pins/${pinSlug}.png`)}" alt="${seasonName(pinSlug)} pin" loading="lazy"></div>
    <div class="posts">${caption({
      id: `PIN-${n}`,
      platform: "Pinterest",
      kind: "Pin",
      title: `${seasonName(pinSlug)} color palette`,
      aiLabel: false,
      caption: `${CAPTION.palette} See all 30 colors.\n\n#coloranalysis${tag(pinSlug)} #colorpalette`,
      link: `https://seasonly.me/seasons/${pinSlug}?utm_source=pinterest`,
    })}</div></div>`);
  count++;
  return `<section class="day" id="day-${n}"><h2><span class="dn">Day ${i + 1}</span> ${dayLabel(date)}, 18:00 ET</h2>${units.join("")}</section>`;
});

const first = dayLabel(BATCH.days.at(0)?.[0] ?? "");
const last = dayLabel(BATCH.days.at(-1)?.[0] ?? "");
const html = `<title>Seasonly ${BATCH.name}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500&family=Instrument+Sans:wght@400;600&display=swap">
<style>
/* Layout: one section per day; each unit = the media on the left, the posts it feeds on the right. Seasonly's own paper, ink and type. */
:root { --paper:#f7f7f7; --surface:#fff; --ink:#1a1a1a; --muted:#595959; --line:#e2e2e2; --ai:#7a3e9d; --ai-bg:#f1e8f7; --warn:#8a5a00; --warn-bg:#fdf3dc;
  --serif:"Bodoni Moda", Didot, "Times New Roman", serif; --sans:"Instrument Sans", system-ui, -apple-system, sans-serif; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper:#151515; --surface:#1f1f1f; --ink:#f0f0f0; --muted:#a8a8a8; --line:#333; --ai:#d6b3ec; --ai-bg:#3a2647; --warn:#f2c86b; --warn-bg:#3d3018; color-scheme:dark } }
:root[data-theme="dark"] { --paper:#151515; --surface:#1f1f1f; --ink:#f0f0f0; --muted:#a8a8a8; --line:#333; --ai:#d6b3ec; --ai-bg:#3a2647; --warn:#f2c86b; --warn-bg:#3d3018; color-scheme:dark }
body { background:var(--paper); color:var(--ink); font:16px/1.5 var(--sans); }
.wrap { max-width:1040px; margin:0 auto; padding-block:40px 80px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); }
h1 { font:500 clamp(36px, 6vw, 56px)/1.05 var(--serif); margin:0 0 16px; text-wrap:balance; }
.eyebrow { text-transform:uppercase; letter-spacing:.12em; font-size:13px; font-weight:600; color:var(--muted); margin:0 0 8px; }
.lead { max-width:65ch; margin:0 0 12px; }
.facts { display:flex; flex-wrap:wrap; gap:8px 24px; margin:24px 0 8px; padding:16px 0; border-block:1px solid var(--line); font-size:14px; color:var(--muted); }
.facts b { color:var(--ink); font-variant-numeric:tabular-nums; }
nav { display:flex; flex-wrap:wrap; gap:8px; margin:16px 0 0; font-size:14px; }
nav a { color:var(--ink); padding:4px 10px; border:1px solid var(--line); border-radius:999px; text-decoration:none; }
nav a:hover, nav a:focus-visible { border-color:var(--ink); }
.day { margin-top:56px; }
.day h2 { font:500 28px/1.2 var(--serif); margin:0 0 16px; padding-bottom:8px; border-bottom:1px solid var(--line); }
.dn { font:600 13px var(--sans); text-transform:uppercase; letter-spacing:.12em; color:var(--muted); margin-right:8px; vertical-align:middle; }
.unit { display:grid; grid-template-columns:240px minmax(0,1fr); gap:24px; padding:20px 0; border-bottom:1px solid var(--line); }
.unit.carousel { grid-template-columns:minmax(0,1fr); }
.media video, .media img { display:block; width:100%; max-width:240px; border-radius:12px; background:var(--line); }
.media video { aspect-ratio:9/16; }
.strip { display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; scroll-snap-type:x mandatory; }
.strip img { flex:0 0 auto; width:200px; max-width:60vw; aspect-ratio:4/5; border-radius:8px; scroll-snap-align:start; border:1px solid var(--line); }
.posts { display:grid; gap:12px; min-width:0; }
.post { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:14px 16px; min-width:0; }
.post:target { outline:2px solid var(--ink); }
.post header { display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; font-size:14px; margin-bottom:8px; }
.pid { font:600 13px ui-monospace, Menlo, monospace; font-variant-numeric:tabular-nums; }
.plat { font-weight:600; }
.kind { color:var(--muted); }
.chip { font-size:12px; padding:2px 8px; border-radius:999px; border:1px solid var(--line); color:var(--muted); }
.chip.ai { border-color:transparent; background:var(--ai-bg); color:var(--ai); font-weight:600; }
.cap { white-space:pre-wrap; overflow-wrap:anywhere; font:15px/1.5 var(--sans); margin:0; }
.title, .link { margin:0 0 8px; font-size:15px; overflow-wrap:anywhere; }
.link { margin:8px 0 0; }
.title span, .link span { font-size:12px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-right:8px; }
.link a { color:var(--ink); }
.note { margin:10px 0 0; padding:8px 10px; border-radius:6px; background:var(--warn-bg); color:var(--warn); font-size:14px; }
@media (max-width:640px) { .unit { grid-template-columns:minmax(0,1fr); } .media video, .media img { max-width:200px; } }
@media (prefers-reduced-motion: reduce) { .strip { scroll-behavior:auto; } }
</style>
<div class="wrap">
  <p class="eyebrow">Launch plan step 6 · review page</p>
  <h1>Seasonly ${BATCH.name}</h1>
  <p class="lead">${count} posts, one a day per platform from ${first} to ${last}, each at 18:00 US Eastern. Answer in chat with yes, or name the posts to drop (for example "drop IG-04, PIN-07"). Your yes covers exactly these posts, captions, titles and links.</p>
  <p class="lead">You approved all 40 on Oct 17; Claude scheduled them in your Chrome on Oct 18, so TikTok's last post stays inside its 10-day limit. No music was added. Posts marked "AI label on" carry the platform's AI-generated content setting.</p>
  <div class="facts"><span><b>${count}</b> posts</span><span><b>10</b> days</span><span><b>4</b> platforms</span><span><b>${files.size}</b> files</span><span>New captions, not from the content pack: <b>${changed.join(", ")}</b></span></div>
  <nav aria-label="Days">${BATCH.days.map((d, i) => `<a href="#day-${String(i + 1).padStart(2, "0")}">${dayLabel(d[0])}</a>`).join("")}</nav>
  ${sections.join("\n")}
</div>
`;

fs.writeFileSync(path.join(OUT, "review.html"), html);
fs.writeFileSync(
  path.join(OUT, "review-files.json"),
  `${JSON.stringify(Object.fromEntries(files), null, 2)}\n`,
);
console.log(`review.html: ${count} posts, ${files.size} files`);
