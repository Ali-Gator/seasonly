/**
 * Launch plan step 5: renders the launch assets into the git-ignored `marketing/out/`.
 *
 *   node scripts/marketing/render.ts [stills|videos|all] [name filter]
 *
 * Every color, name and season comes from the analysis core or from `faces.json`, the core's own
 * result for each fictional face (`faces.ts analyze`), so what a post shows is what a visitor
 * gets. Stills: 12 carousels of 7 slides at 1080×1350, 12 Pinterest pins at 1000×1500, the
 * Product Hunt thumbnail (240×240) and gallery (5 at 1270×760). Videos: 1080×1920 at 30 fps,
 * each frame set by `seek(ms)` and screenshotted, then encoded to H.264 by ffmpeg. Free: no paid call.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";

import {
  PALETTES,
  SEASON_SLUGS,
  type SeasonSlug,
  type Swatch,
} from "../../packages/analysis/src/index.ts";
import { RETAKE_TIPS } from "../../packages/analysis/src/photo-check/tips.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "marketing/out");
const ORIGIN = "https://assets.local";
const FPS = 30;

const seasonName = (slug: string) =>
  slug.replace(/(^|-)(\w)/g, (_, dash: string, c: string) => (dash ? " " : "") + c.toUpperCase());

interface Face {
  id: string;
  file: string;
  problem: string | null;
  season: SeasonSlug | null;
  draping: { best: Swatch; worst: Swatch } | null;
}
const FACES: Face[] = JSON.parse(fs.readFileSync(path.join(OUT, "faces/faces.json"), "utf8"));
const face = (id: string) => {
  const f = FACES.find((x) => x.id === id);
  if (!f) throw new Error(`no face ${id} in faces.json: run faces.ts analyze`);
  return f;
};
/** The generated models in order, the guide's own example face when none passed the check yet. */
const models = FACES.filter((f) => !f.id.startsWith("ex-") && f.season);
const model = (n: number) => models[n % Math.max(models.length, 1)] ?? face("ex-face");

// ---------------------------------------------------------------------------------------------
// Shared markup

const CSS = `
@font-face { font-family: "Bodoni Moda"; src: url(/fonts/BodoniModa-Medium.ttf); font-weight: 500; }
@font-face { font-family: "Instrument Sans"; src: url(/fonts/InstrumentSans-Regular.ttf); font-weight: 400; }
@font-face { font-family: "Instrument Sans"; src: url(/fonts/InstrumentSans-SemiBold.ttf); font-weight: 600; }
:root { --paper: #f7f7f7; --surface: #fff; --ink: #1a1a1a; --muted: #595959; --line: #e2e2e2;
  --edge: rgba(0,0,0,.1); --danger: #9a3a33; --danger-soft: #f7ecea; --success: #386447; --success-soft: #eaf1ec; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 100%; height: 100%; }
body { background: var(--paper); color: var(--ink); font: 400 32px/1.3 "Instrument Sans", sans-serif; overflow: hidden; }
.stage { position: relative; overflow: hidden; background: var(--paper); }
.serif { font-family: "Bodoni Moda", serif; font-weight: 500; letter-spacing: -0.01em; }
.eyebrow { font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
.muted { color: var(--muted); }
.sw { display: flex; gap: .55em; align-items: center; min-width: 0; }
.sw i { flex: none; width: 2.6em; height: 1.5em; border-radius: .3em; box-shadow: inset 0 0 0 2px var(--edge); }
.sw b { display: block; font-weight: 600; line-height: 1.1; }
.sw span { display: block; color: var(--muted); line-height: 1.1; }
.chip { display: inline-block; padding: .25em .7em; border-radius: 999px; font-weight: 600; }
.wordmark { font-family: "Bodoni Moda", serif; font-weight: 500; }
.drape { position: relative; overflow: hidden; aspect-ratio: 3 / 4; border-radius: 40px; box-shadow: inset 0 0 0 2px var(--edge); }
.drape .face { position: absolute; left: 14%; right: 14%; top: 8%; height: 74%; overflow: hidden;
  border-radius: 50% 50% 46% 46% / 42% 42% 58% 58%; }
.drape .face img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; transform: scale(1.15);
  -webkit-mask: var(--mask) 50% 40% / cover no-repeat; mask: var(--mask) 50% 40% / cover no-repeat; }
.drape::after { content: ""; position: absolute; left: -10%; right: -10%; bottom: 0; height: 24%;
  border-radius: 50% 50% 0 0 / 38% 38% 0 0; background: inherit; }
.photo { border-radius: 32px; object-fit: cover; box-shadow: 0 0 0 2px var(--edge); }
.note { border-radius: 24px; padding: 28px 32px; }
.note.bad { background: var(--danger-soft); } .note.bad b { color: var(--danger); }
.note.good { background: var(--success-soft); } .note.good b { color: var(--success); }
`;

const sw = ({ name, hex }: Swatch) =>
  `<div class="sw"><i style="background:${hex}"></i><div><b>${name}</b><span>${hex}</span></div></div>`;
const grid = (colors: readonly Swatch[], cols: number, gap = "28px 32px") =>
  `<div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}">${colors.map(sw).join("")}</div>`;
const bar = (colors: readonly Swatch[], h = 40) =>
  `<div style="display:flex;height:${h}px;border-radius:${h / 4}px;overflow:hidden">${colors
    .map((c) => `<i style="flex:1;background:${c.hex}"></i>`)
    .join("")}</div>`;

/** A face on one drape color, cut out with its outline, as the report's DrapingPair draws it. */
const drape = (f: Face, color: Swatch, width: number) =>
  `<div class="drape" style="width:${width}px;background:${color.hex}"><div class="face" style="--mask:url(/out/faces/${f.id}.mask.png)"><img src="/out/faces/${f.id}.crop.jpg"></div></div>`;
const verdict = (kind: "best" | "worst", c: Swatch) =>
  `<div style="margin-top:20px"><span class="chip" style="background:var(--${kind === "best" ? "success" : "danger"}-soft);color:var(--${kind === "best" ? "success" : "danger"})">${kind === "best" ? "✓ Best" : "✕ Worst"}</span> <b style="margin-left:.4em">${c.name}</b> <span class="muted">${c.hex}</span></div>`;

const page = (w: number, h: number, body: string, fontSize = 32) =>
  `<!doctype html><meta charset="utf-8"><style>${CSS} body{font-size:${fontSize}px}</style><div class="stage" id="stage" style="width:${w}px;height:${h}px">${body}</div>`;

// ---------------------------------------------------------------------------------------------
// Stills

type Still = { file: string; w: number; h: number; html: string };

function carousel(slug: SeasonSlug): Still[] {
  const p = PALETTES[slug];
  const name = seasonName(slug);
  const W = 1080;
  const H = 1350;
  // The share card and the last slide carry the address already, so they skip the footer.
  const frame = (inner: string, n: number, footer = true) => ({
    file: `carousels/${slug}/${n}.png`,
    w: W,
    h: H,
    html: page(
      W,
      H,
      `<div style="position:absolute;inset:96px 80px 80px">${inner}</div>${
        footer
          ? `<div style="position:absolute;left:80px;right:80px;bottom:56px;display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid var(--line);padding-top:24px">
       <span class="wordmark" style="font-size:44px">Seasonly</span><span class="muted" style="font-size:36px">seasonly.me</span></div>`
          : ""
      }`,
    ),
  });
  const title = (eyebrow: string, heading: string) =>
    `<div class="eyebrow" style="font-size:34px">${eyebrow}</div><div class="serif" style="font-size:96px;line-height:1.05;margin:8px 0 48px">${heading}</div>`;
  return [
    frame(
      `<div class="eyebrow" style="font-size:36px;margin-top:80px">Color season</div>
       <div class="serif" style="font-size:150px;line-height:1;margin:16px 0 40px">This is<br>${name}.</div>
       ${bar(p.highlights, 120)}
       <div style="font-size:48px;margin-top:56px">Swipe for the colors →</div>`,
      1,
    ),
    frame(
      `<img src="/out/site/share-${slug}-post.png" style="display:block;width:920px;margin:60px auto 0;border-radius:24px;box-shadow:0 0 0 2px var(--edge)">`,
      2,
      false,
    ),
    frame(
      `${title(name, "Best colors")}<div style="font-size:26px">${grid(p.best, 2, "14px 32px")}</div>`,
      3,
    ),
    frame(
      `${title(name, "Colors to avoid")}<div style="font-size:40px">${grid(p.avoid, 2, "56px 32px")}</div>
       <p class="muted" style="margin-top:56px;font-size:36px">These compete with your coloring. Keep them away from your face: trousers, shoes, bags.</p>`,
      4,
    ),
    frame(
      `${title(name, "Neutrals and metals")}<div style="font-size:36px">${grid(p.neutrals, 2, "36px 32px")}
       <div class="eyebrow" style="font-size:28px;margin:56px 0 28px">Metals</div>${grid(p.metals, 2, "36px 32px")}</div>`,
      5,
    ),
    frame(
      `${title(name, "Makeup and hair")}
       ${[
         ["Lips", p.lips],
         ["Blush", p.blush],
         ["Eyes", p.eyes],
         ["Hair", p.hair],
       ]
         .map(
           ([label, colors]) =>
             `<div class="eyebrow" style="font-size:26px;margin:28px 0 16px">${label}</div><div style="font-size:30px">${grid(colors as Swatch[], 3, "16px 20px")}</div>`,
         )
         .join("")}`,
      6,
    ),
    frame(
      `<div class="serif" style="font-size:120px;line-height:1.05;margin-top:120px">Find your season from one selfie</div>
       <div style="font-size:44px;margin-top:56px">Free · four quick questions · under a minute</div>
       <div class="serif" style="font-size:96px;margin-top:120px">seasonly.me</div>`,
      7,
      false,
    ),
  ];
}

function pin(slug: SeasonSlug): Still {
  const p = PALETTES[slug];
  return {
    file: `pins/${slug}.png`,
    w: 1000,
    h: 1500,
    html: page(
      1000,
      1500,
      `<div style="position:absolute;inset:72px 72px 0">
        <div class="eyebrow" style="font-size:30px">Color palette · 30 colors</div>
        <div class="serif" style="font-size:104px;line-height:1.05;margin:8px 0 40px">${seasonName(slug)}</div>
        ${grid([...p.best, ...p.neutrals], 3, "34px 24px")}
       </div>
       <div style="position:absolute;left:72px;right:72px;bottom:56px;display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid var(--line);padding-top:24px">
        <span style="font-size:30px">Find your season from one selfie</span><span class="wordmark" style="font-size:44px">seasonly.me</span></div>`,
      29,
    ),
  };
}

function productHunt(): Still[] {
  const W = 1270;
  const H = 760;
  const sample = model(0);
  const daylight = face("ex-base");
  const tint = RETAKE_TIPS.tint;
  const slide = (n: number, heading: string, sub: string, right: string) => ({
    file: `producthunt/gallery-${n}.png`,
    w: W,
    h: H,
    html: page(
      W,
      H,
      `<div style="position:absolute;left:72px;top:72px;width:470px">
         <div class="wordmark" style="font-size:40px">Seasonly</div>
         <div class="serif" style="font-size:66px;line-height:1.08;margin:48px 0 24px">${heading}</div>
         <p class="muted" style="font-size:28px">${sub}</p></div>
       <div style="position:absolute;left:600px;right:72px;top:72px;bottom:72px;display:flex;align-items:center;justify-content:center">${right}</div>`,
      24,
    ),
  });
  if (!sample.draping || !daylight.season)
    throw new Error("ex-face and ex-base must pass the check");
  return [
    {
      file: "producthunt/thumbnail.png",
      w: 240,
      h: 240,
      html: `<!doctype html><style>*{margin:0}body{width:240px;height:240px;overflow:hidden}</style><img id="stage" src="/app/icon.svg" width="240" height="240">`,
    },
    slide(
      1,
      "Find your color season from one selfie",
      "One daylight selfie and four quick questions. Free, no account.",
      `<img src="/out/site/share-${daylight.season}-post.png" style="height:600px;border-radius:24px;box-shadow:0 0 0 2px var(--edge)">`,
    ),
    slide(
      2,
      "It checks your photo first",
      "A warm lamp or a tinted wall shifts your skin tone. Seasonly asks for a retake before it misleads you.",
      `<div style="display:flex;gap:32px;align-items:flex-start">
        <div style="width:290px"><img class="photo" src="/out/faces/ex-lamp.webp" style="width:290px;height:386px">
          <div class="note bad" style="margin-top:20px;padding:20px 22px;font-size:20px"><b>${tint.title}</b><br>${tint.tip}</div></div>
        <div style="width:290px"><img class="photo" src="/out/faces/ex-base.webp" style="width:290px;height:386px">
          <div class="note good" style="margin-top:20px;padding:20px 22px;font-size:20px"><b>✓ Photo accepted</b><br>Daylight, no filter: ${seasonName(daylight.season)}.</div></div></div>`,
    ),
    slide(
      3,
      "See it on your own face",
      "The draping preview puts your face on your best and worst color. Shown with an AI-generated model.",
      `<div style="display:flex;gap:28px;font-size:20px">
        <div>${drape(sample, sample.draping.best, 280)}${verdict("best", sample.draping.best)}</div>
        <div>${drape(sample, sample.draping.worst, 280)}${verdict("worst", sample.draping.worst)}</div></div>`,
    ),
    slide(
      4,
      "30 named colors with hex codes",
      "Plus colors to avoid, neutrals, metals, and lip, blush, eye and hair colors.",
      `<div style="width:100%;font-size:20px">${grid(PALETTES[daylight.season].best.slice(0, 18), 3, "18px 20px")}</div>`,
    ),
    slide(
      5,
      "One of 12 seasons",
      "Light, True or Bright Spring; Light, True or Soft Summer; Soft, True or Deep Autumn; Deep, True or Bright Winter.",
      `<div style="width:100%;display:grid;gap:10px">${SEASON_SLUGS.map(
        (s) =>
          `<div style="display:grid;grid-template-columns:200px 1fr;align-items:center;font-size:20px;font-weight:600">${seasonName(s)}${bar(PALETTES[s].highlights, 34)}</div>`,
      ).join("")}</div>`,
    ),
  ];
}

// ---------------------------------------------------------------------------------------------
// Videos: elements with data-in / data-out (ms) fade and rise in, and fade out; seek(ms) sets them.

const SEEK = `<script>
window.seek = (t) => {
  for (const el of document.querySelectorAll("[data-in]")) {
    const a = +el.dataset.in, b = el.dataset.out ? +el.dataset.out : Infinity;
    const fadeIn = Math.min(1, Math.max(0, (t - a) / 250));
    const fadeOut = Math.min(1, Math.max(0, (b - t) / 250));
    el.style.opacity = Math.min(fadeIn, fadeOut);
    el.style.translate = "0 " + (1 - fadeIn) * 30 + "px";
  }
};
</script>`;

interface Video {
  id: string;
  /** The Content tab's hook number. */
  hook: number;
  text: string;
  /** Shows a generated face or body: the on-screen label goes on. */
  generated: boolean;
  ms: number;
  body: string;
}

const at = (from: number, to?: number) =>
  `data-in="${from}"${to === undefined ? "" : ` data-out="${to}"`} style="opacity:0;`;
const abs = (css: string) => `position:absolute;${css}"`;

function videoPage(v: Video) {
  const end = v.ms - 3000;
  return `${page(
    1080,
    1920,
    `${v.body}
     <div ${at(0, 2400)}${abs("left:0;right:0;top:0;bottom:0;background:rgba(247,247,247,.9);display:flex;align-items:center;padding:0 90px")}>
       <div class="serif" style="font-size:118px;line-height:1.05">${v.text}</div></div>
     ${
       v.generated
         ? `<div style="position:absolute;left:80px;top:150px;font-size:28px"><span class="chip" style="background:rgba(26,26,26,.75);color:#fff">Demo · AI-generated model</span></div>`
         : ""
     }
     <div ${at(end)}${abs("inset:0;background:var(--paper);display:flex;flex-direction:column;justify-content:center;padding:0 90px")}>
       <div class="wordmark" style="font-size:72px">Seasonly</div>
       <div class="serif" style="font-size:150px;line-height:1.02;margin:56px 0">Free · one selfie</div>
       <div class="serif" style="font-size:132px">seasonly.me</div></div>`,
    40,
  )}${SEEK}`;
}

function videos(): Video[] {
  const list: Video[] = [];
  const top = 340; // below the platform's top bar and the label

  {
    const f = model(0);
    const d = f.draping;
    if (d) {
      const swaps = [2400, 4400, 6400, 8400, 10400];
      list.push({
        id: "01-draping-same-face",
        hook: 1,
        text: "Same face. Two colors. Watch.",
        generated: true,
        ms: 20000,
        body:
          swaps
            .map((s, i) => {
              const c = i % 2 ? d.worst : d.best;
              const kind = i % 2 ? "worst" : "best";
              return `<div ${at(i ? s : 0, i === swaps.length - 1 ? 13000 : (swaps[i + 1] ?? 0) + 200)}${abs(`left:90px;top:${top}px`)}>${drape(f, c, 900)}${verdict(kind, c)}</div>`;
            })
            .join("") +
          `<div ${at(13000)}${abs(`left:90px;right:90px;top:${top}px`)}>
            <div style="display:flex;gap:40px;font-size:34px"><div>${drape(f, d.best, 430)}${verdict("best", d.best)}</div><div>${drape(f, d.worst, 430)}${verdict("worst", d.worst)}</div></div>
            <div class="eyebrow" style="margin-top:80px">Her result</div><div class="serif" style="font-size:120px">${seasonName(f.season ?? "")}</div></div>`,
      });
    }
  }

  {
    const f = model(1);
    const d = f.draping;
    if (d && f.season)
      list.push({
        id: "02-draping-worst-first",
        hook: 2,
        text: "Your worst color does this to your face",
        generated: true,
        ms: 18000,
        body: `<div ${at(0, 5200)}${abs(`left:90px;top:${top}px`)}>${drape(f, d.worst, 900)}${verdict("worst", d.worst)}</div>
          <div ${at(5000, 9200)}${abs(`left:90px;top:${top}px`)}>${drape(f, d.best, 900)}${verdict("best", d.best)}</div>
          <div ${at(9000)}${abs(`left:90px;right:90px;top:${top}px`)}>
            <div style="display:flex;gap:40px;font-size:34px"><div>${drape(f, d.worst, 430)}${verdict("worst", d.worst)}</div><div>${drape(f, d.best, 430)}${verdict("best", d.best)}</div></div>
            <div class="eyebrow" style="margin-top:72px">Her season</div><div class="serif" style="font-size:120px;margin-bottom:32px">${seasonName(f.season)}</div>${bar(PALETTES[f.season].highlights, 90)}</div>`,
      });
  }

  {
    const options = [
      ["green", "Green or olive", "Often a warm undertone", ["true-spring", "true-autumn"]],
      ["blue", "Blue or purple", "Often a cool undertone", ["true-summer", "true-winter"]],
      ["mix", "A mix of both", "Often a neutral undertone", []],
    ] as const;
    list.push({
      id: "03-veins",
      hook: 7,
      text: "Check your wrist: green veins or blue?",
      generated: true,
      ms: 19000,
      body:
        options
          .map(
            ([img, label, hint, seasons], i) =>
              `<div ${at(i ? 2400 + i * 4000 : 0, 2400 + (i + 1) * 4000 + 200)}${abs(`left:90px;right:90px;top:${top}px`)}>
                <img class="photo" src="/public/images/quiz/veins-${img}.webp" style="width:900px;height:900px">
                <div class="serif" style="font-size:84px;margin-top:40px">${label}</div>
                <div class="muted" style="font-size:44px;margin:8px 0 36px">${hint}</div>
                ${seasons.map((s) => `<div style="display:grid;grid-template-columns:330px 1fr;align-items:center;font-weight:600;margin-top:16px">${seasonName(s)}${bar(PALETTES[s].highlights, 56)}</div>`).join("")}</div>`,
          )
          .join("") +
        `<div ${at(14400)}${abs(`left:90px;right:90px;top:${top + 200}px`)}><div class="serif" style="font-size:100px;line-height:1.08">One of four questions.<br>Plus one selfie.</div>
          <p class="muted" style="font-size:44px;margin-top:40px">Veins, jewelry, sun and natural hair fill in what a photo can't show.</p></div>`,
    });
  }

  {
    const p = PALETTES["soft-autumn"];
    const colors = [...p.best, ...p.neutrals];
    list.push({
      id: "04-soft-autumn-palette",
      hook: 9,
      text: "This is a Soft Autumn palette",
      generated: false,
      ms: 17000,
      body: `<div ${at(0)}${abs(`left:90px;right:90px;top:${top - 60}px`)}><div class="eyebrow">My colors</div><div class="serif" style="font-size:120px;margin-bottom:40px">Soft Autumn</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:28px 16px;font-size:24px;line-height:1.15">${colors
          .map(
            (c, i) =>
              `<div ${at(2400 + i * 320)}"><i style="display:block;height:120px;border-radius:16px;background:${c.hex};box-shadow:inset 0 0 0 2px var(--edge)"></i><b style="display:block;margin-top:10px">${c.name}</b><span class="muted">${c.hex}</span></div>`,
          )
          .join("")}</div></div>`,
    });
  }

  list.push({
    id: "05-twelve-palettes",
    hook: 10,
    text: "12 seasons, 12 palettes, 15 seconds",
    generated: false,
    ms: 17500,
    body: SEASON_SLUGS.map(
      (s, i) =>
        `<div ${at(i ? 2400 + i * 1000 : 0, i === 11 ? undefined : 2400 + (i + 1) * 1000 + 150)}${abs(`left:90px;right:90px;top:${top - 40}px`)}>
          <div class="eyebrow">${i + 1} of 12</div><div class="serif" style="font-size:120px;margin-bottom:40px">${seasonName(s)}</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">${PALETTES[s].best
            .slice(0, 16)
            .map(
              (c) =>
                `<i style="display:block;height:190px;border-radius:20px;background:${c.hex};box-shadow:inset 0 0 0 2px var(--edge)"></i>`,
            )
            .join("")}</div></div>`,
    ).join(""),
  });

  {
    const s: SeasonSlug = "true-winter";
    const p = PALETTES[s];
    list.push({
      id: "06-wear-skip",
      hook: 11,
      text: "Wear these. Skip these.",
      generated: false,
      ms: 16000,
      body: `<div ${at(0, 7600)}${abs(`left:90px;right:90px;top:${top - 40}px`)}><div class="eyebrow">${seasonName(s)}</div>
          <div class="serif" style="font-size:120px;color:var(--success);margin-bottom:48px">Wear these</div>
          <div style="display:grid;gap:36px;font-size:44px">${p.highlights.map((c, i) => `<div ${at(2400 + i * 450)}">${sw(c)}</div>`).join("")}</div></div>
        <div ${at(7400)}${abs(`left:90px;right:90px;top:${top - 40}px`)}><div class="eyebrow">${seasonName(s)}</div>
          <div class="serif" style="font-size:120px;color:var(--danger);margin-bottom:48px">Skip these</div>
          <div style="display:grid;gap:36px;font-size:44px">${p.avoid.map((c, i) => `<div ${at(7800 + i * 450)}">${sw(c)}</div>`).join("")}</div></div>`,
    });
  }

  {
    const base = face("ex-base");
    const filtered = face("ex-filter");
    if (base.season && filtered.season && base.season !== filtered.season)
      list.push({
        id: "07-filter-changes-season",
        hook: 13,
        text: "Your selfie filter changes your season",
        generated: true,
        ms: 18000,
        body:
          [
            [base, "Straight from the camera", 0, 7200],
            [filtered, "Beauty filter on", 7000, 13200],
          ]
            .map(
              ([f, label, from, to]) =>
                `<div ${at(from as number, to as number)}${abs(`left:90px;right:90px;top:${top}px`)}>
                <img class="photo" src="/out/faces/${(f as Face).file}" style="width:900px;height:1000px">
                <div class="eyebrow" style="margin-top:40px">${label}</div>
                <div ${at((from as number) + 2600)}"><div class="serif" style="font-size:110px;margin:4px 0 24px">${seasonName((f as Face).season ?? "")}</div>${bar(PALETTES[(f as Face).season as SeasonSlug].highlights, 80)}</div></div>`,
            )
            .join("") +
          `<div ${at(13000)}${abs(`left:90px;right:90px;top:${top + 200}px`)}><div class="serif" style="font-size:110px;line-height:1.05">Same face.<br>Different season.</div>
            <p style="font-size:48px;margin-top:48px">Take it straight from the camera, by a window.</p></div>`,
      });
  }

  {
    const lamp = face("ex-lamp");
    const base = face("ex-base");
    const tip = RETAKE_TIPS.tint;
    if (lamp.problem === "tint" && base.season)
      list.push({
        id: "08-indoor-light",
        hook: 14,
        text: "Indoor light picks the wrong colors",
        generated: true,
        ms: 17000,
        body: `<div ${at(0, 7700)}${abs(`left:90px;right:90px;top:${top}px`)}><img class="photo" src="/out/faces/ex-lamp.webp" style="width:900px;height:1000px">
            <div ${at(2600)}"><div class="note bad" style="margin-top:36px;font-size:38px"><b>${tip.title}</b><br>${tip.tip}</div></div></div>
          <div ${at(7500)}${abs(`left:90px;right:90px;top:${top}px`)}><img class="photo" src="/out/faces/ex-base.webp" style="width:900px;height:1000px">
            <div ${at(9300)}"><div class="note good" style="margin-top:36px;font-size:38px"><b>✓ Photo accepted</b><br>Daylight from a window: ${seasonName(base.season)}.</div>
            <div style="margin-top:32px">${bar(PALETTES[base.season].highlights, 80)}</div></div></div>`,
      });
  }

  {
    const lists = SEASON_SLUGS.filter((s) => PALETTES[s].avoid.some((c) => c.name === "Jet Black"));
    const jet = lists[0] && PALETTES[lists[0]].avoid.find((c) => c.name === "Jet Black");
    list.push({
      id: "09-jet-black",
      hook: 16,
      text: `Jet black is on ${lists.length} of 12 avoid lists`,
      generated: false,
      ms: 15000,
      body: `<div ${at(0)}${abs(`left:90px;right:90px;top:${top - 40}px`)}><div class="eyebrow" style="margin-bottom:32px">${jet?.name} ${jet?.hex}, season by season</div>
        <div style="display:grid;gap:18px;font-size:42px">${SEASON_SLUGS.map((s, i) => {
          const avoid = lists.includes(s);
          return `<div ${at(2400 + i * 350)}display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:2px solid var(--line)"><b>${seasonName(s)}</b>${
            avoid
              ? `<span class="chip" style="background:var(--danger-soft);color:var(--danger)">✕ Avoid</span>`
              : `<span class="muted">not on its avoid list</span>`
          }</div>`;
        }).join("")}</div></div>`,
    });
  }

  {
    const f = model(2);
    const d = f.draping;
    if (d && f.season)
      list.push({
        id: "10-gpt-retires",
        hook: 17,
        text: "The color analysis GPT retires Dec 11",
        generated: true,
        ms: 20000,
        body: `<div ${at(2400, 6200)}${abs(`left:90px;right:90px;top:${top + 120}px`)}><div class="serif" style="font-size:96px;line-height:1.08">OpenAI retires custom GPTs on December 11, 2026.</div>
            <p class="muted" style="font-size:48px;margin-top:40px">Color analysis GPTs among them.</p></div>
          <div ${at(6000, 10200)}${abs(`left:90px;right:90px;top:${top}px`)}><div class="eyebrow" style="margin-bottom:24px">Seasonly: one selfie</div>
            <img class="photo" src="/out/faces/${f.file}" style="width:900px;height:1100px"></div>
          <div ${at(10000)}${abs(`left:90px;right:90px;top:${top}px`)}><div class="eyebrow">Her season</div><div class="serif" style="font-size:120px;margin-bottom:36px">${seasonName(f.season)}</div>
            <div style="display:flex;gap:40px;font-size:34px"><div>${drape(f, d.best, 430)}${verdict("best", d.best)}</div><div>${drape(f, d.worst, 430)}${verdict("worst", d.worst)}</div></div>
            <div ${at(12500)}margin-top:48px">${bar(PALETTES[f.season].highlights, 90)}<p class="muted" style="font-size:40px;margin-top:24px">Plus a photo check and 30 named colors.</p></div></div>`,
      });
  }

  return list;
}

// ---------------------------------------------------------------------------------------------
// Runner

const ROUTES: Record<string, string> = {
  "/fonts/": "apps/web/src/lib/og/fonts/",
  "/public/": "apps/web/public/",
  "/out/": "marketing/out/",
  "/app/": "apps/web/src/app/",
};

async function open(html: () => string, w: number, h: number): Promise<Page> {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on("pageerror", (error) => console.error("page:", error.message));
  await p.route(`${ORIGIN}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/") return route.fulfill({ contentType: "text/html", body: html() });
    const prefix = Object.keys(ROUTES).find((r) => pathname.startsWith(r));
    const file = prefix && path.join(ROOT, ROUTES[prefix] ?? "", pathname.slice(prefix.length));
    if (file && fs.existsSync(file)) return route.fulfill({ path: file });
    console.error(`missing: ${pathname}`);
    return route.fulfill({ status: 404 });
  });
  await p.goto(`${ORIGIN}/`);
  await p.evaluate(() => document.fonts.ready);
  return p;
}

async function renderStill(s: Still) {
  const p = await open(() => s.html, s.w, s.h);
  const out = path.join(OUT, s.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.locator("#stage").screenshot({ path: out });
  await p.close();
}

async function renderVideo(v: Video) {
  const p = await open(() => videoPage(v), 1080, 1920);
  const out = path.join(OUT, "videos", `${v.id}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-framerate",
      String(FPS),
      "-c:v",
      "mjpeg",
      "-i",
      "-",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      out,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const done = new Promise<void>((resolve, reject) =>
    ffmpeg.on("close", (code) => (code ? reject(new Error(`ffmpeg exited ${code}`)) : resolve())),
  );
  const frames = Math.round((v.ms / 1000) * FPS);
  for (let i = 0; i < frames; i++) {
    await p.evaluate(
      (t) => (window as unknown as { seek: (t: number) => void }).seek(t),
      (i * 1000) / FPS,
    );
    const jpeg = await p.screenshot({ type: "jpeg", quality: 92 });
    if (!ffmpeg.stdin.write(jpeg)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
  }
  ffmpeg.stdin.end();
  await done;
  await p.close();
  console.log(`${v.id}.mp4: ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
}

const [what = "all", filter = ""] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  if (what === "stills" || what === "all") {
    const stills = [...SEASON_SLUGS.flatMap(carousel), ...SEASON_SLUGS.map(pin), ...productHunt()];
    for (const s of stills.filter((s) => s.file.includes(filter))) await renderStill(s);
    console.log(`${stills.length} stills`);
  }
  if (what === "videos" || what === "all") {
    const list = videos().filter((v) => v.id.includes(filter));
    for (const v of list) await renderVideo(v);
    fs.writeFileSync(
      path.join(OUT, "videos/videos.json"),
      `${JSON.stringify(
        videos().map(({ id, hook, text, generated, ms }) => ({ id, hook, text, generated, ms })),
        null,
        2,
      )}\n`,
    );
  }
} finally {
  await browser.close();
}
