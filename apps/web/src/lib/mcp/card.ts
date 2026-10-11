/**
 * The inline card ChatGPT and Claude show for a tool result: an MCP Apps `ui://` resource, one
 * static HTML document with its CSS and glue inline, from the approved canvas boards "22 Chat card"
 * and "22b Chat card · no result". It follows the host's look: system font and the host's text
 * colors, no logo, the swatches its only strong color. It loads nothing from the network.
 *
 * The glue speaks the MCP Apps bridge (spec 2026-01-26) over `postMessage`: `ui/initialize`, then
 * `ui/notifications/initialized`; it renders on `ui/notifications/tool-result`, follows theme
 * changes, opens the link with `ui/open-link` and reports its size.
 *
 * {@link openspec/specs/chat-plugin/spec.md#requirement-the-result-is-an-inline-card-with-text-for-hosts-without-one}
 */
import type { PluginResult } from "./result";

/**
 * The card's markup for one result. Inlined into the card's script by its source, so it uses
 * nothing outside its own body.
 */
export function renderCard(result: PluginResult): string {
  const esc = (s: string) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
    );
  const action = '<button type="button" class="btn">Get my full analysis</button>';
  if (result.kind === "no-result") {
    return `<article class="card" aria-label="No season from these answers"><div class="head"><p class="title">${esc(result.title)}</p><p class="muted">${esc(result.message)}</p></div>${action}</article>`;
  }
  const swatches = result.colors
    .filter((c) => /^#[0-9A-F]{6}$/i.test(c.hex))
    .map(
      (c) =>
        `<li><figure class="swatch"><div class="chip" style="background:${c.hex}" aria-hidden="true"></div><figcaption><span class="name">${esc(c.name)}</span> <span class="hex">${esc(c.hex)}</span></figcaption></figure></li>`,
    )
    .join("");
  return `<article class="card" aria-label="Your season family"><div class="head"><p class="overline">Your season family</p><p class="family">${esc(result.family)}</p><p class="muted">${esc(result.tagline)}</p></div><ul class="swatches" aria-label="6 of your colors">${swatches}</ul><p class="note">${esc(result.note)}</p>${action}</article>`;
}

/** The bridge: plain browser JS, run in the host's sandboxed iframe. */
const GLUE = `(function () {
  var renderCard = (${renderCard.toString()});
  var ORIGIN = "https://seasonly.me/";
  var root = document.getElementById("card");
  var host = window.parent;
  var nextId = 1;
  var pending = {};
  var link = null;

  function post(message) {
    message.jsonrpc = "2.0";
    host.postMessage(message, "*");
  }
  function request(method, params, done) {
    var id = nextId++;
    pending[id] = done;
    post({ id: id, method: method, params: params });
  }
  function notify(method, params) {
    post({ method: method, params: params });
  }
  function applyContext(context) {
    if (!context) return;
    if (context.theme === "light" || context.theme === "dark") {
      document.documentElement.dataset.theme = context.theme;
    }
    var vars = context.styles && context.styles.variables;
    if (vars) {
      for (var name in vars) {
        if (vars[name]) document.documentElement.style.setProperty(name, vars[name]);
      }
    }
  }
  // The card's own box, not the document's: a frame opened taller than the card must shrink to it.
  // Measured at render too, since a host may show the frame before it lays out or paints.
  var lastHeight = 0;
  function reportSize() {
    var box = root.getBoundingClientRect();
    var height = Math.ceil(box.height);
    if (height === lastHeight) return;
    lastHeight = height;
    notify("ui/notifications/size-changed", { width: Math.ceil(box.width), height: height });
  }
  function show(result) {
    if (!result || (result.kind !== "season" && result.kind !== "no-result")) return;
    link = typeof result.link === "string" && result.link.indexOf(ORIGIN) === 0 ? result.link : null;
    root.innerHTML = renderCard(result);
    reportSize();
    root.querySelector("button").addEventListener("click", function () {
      if (link) request("ui/open-link", { url: link }, function () {});
    });
  }

  window.addEventListener("message", function (event) {
    if (event.source !== host) return;
    var message = event.data;
    if (!message || message.jsonrpc !== "2.0") return;
    if (!message.method && message.id != null && pending[message.id]) {
      var done = pending[message.id];
      delete pending[message.id];
      done(message.result);
    } else if (message.method === "ui/notifications/tool-result") {
      show(message.params && message.params.structuredContent);
    } else if (message.method === "ui/notifications/host-context-changed") {
      applyContext(message.params);
    }
  });

  request(
    "ui/initialize",
    {
      protocolVersion: "2026-01-26",
      clientInfo: { name: "seasonly-card", version: "1.0.0" },
      appCapabilities: { availableDisplayModes: ["inline"] },
    },
    function (result) {
      applyContext(result && result.hostContext);
      notify("ui/notifications/initialized", {});
    },
  );

  if (window.ResizeObserver) new ResizeObserver(reportSize).observe(root);
})();`;

/**
 * Light values from the board, dark values from its dark frames; a host's own style variables win
 * where it sends them.
 */
const STYLE = `
:root{color-scheme:light;--fb-ink:#0d0d0d;--fb-muted:#5d5d5d;--fb-line:rgba(0,0,0,0.1);--fb-btn:#0d0d0d;--fb-on-btn:#ffffff;--fb-edge:rgba(0,0,0,0.1)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--fb-ink:#ececec;--fb-muted:#b4b4b4;--fb-line:rgba(255,255,255,0.14);--fb-btn:#ffffff;--fb-on-btn:#0d0d0d;--fb-edge:rgba(255,255,255,0.16)}}
:root[data-theme="dark"]{color-scheme:dark;--fb-ink:#ececec;--fb-muted:#b4b4b4;--fb-line:rgba(255,255,255,0.14);--fb-btn:#ffffff;--fb-on-btn:#0d0d0d;--fb-edge:rgba(255,255,255,0.16)}
html,body{margin:0;background:transparent}
body{font-family:var(--font-sans,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);-webkit-font-smoothing:antialiased;color:var(--color-text-primary,var(--fb-ink))}
p,ul,figure{margin:0;padding:0}
ul{list-style:none}
.card{box-sizing:border-box;display:flex;flex-direction:column;gap:16px;padding:16px;border:1px solid var(--color-border-tertiary,var(--fb-line));border-radius:16px}
.head{display:flex;flex-direction:column;gap:4px}
.overline{font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-text-secondary,var(--fb-muted))}
.family{font-size:28px;line-height:34px;font-weight:600;letter-spacing:-0.01em}
.title{font-size:20px;line-height:26px;font-weight:600}
.card[aria-label^="No"] .head{gap:8px}
.muted{font-size:15px;line-height:22px;color:var(--color-text-secondary,var(--fb-muted))}
.swatches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 12px}
.swatch{display:flex;flex-direction:column;gap:8px;min-width:0}
.chip{aspect-ratio:1;border-radius:8px;box-shadow:inset 0 0 0 1px var(--fb-edge)}
figcaption{display:flex;flex-direction:column;gap:2px}
.name{font-size:13px;line-height:18px;overflow-wrap:anywhere}
.hex{font-size:12px;line-height:16px;font-weight:500;letter-spacing:0.02em;font-variant-numeric:tabular-nums;text-transform:uppercase;color:var(--color-text-secondary,var(--fb-muted))}
.note{font-size:13px;line-height:18px;color:var(--color-text-secondary,var(--fb-muted))}
.btn{width:100%;min-height:44px;padding:0 20px;border:0;border-radius:999px;font-family:inherit;font-size:15px;line-height:20px;font-weight:600;cursor:pointer;background:var(--color-background-inverse,var(--fb-btn));color:var(--color-text-inverse,var(--fb-on-btn))}
.btn:focus-visible{outline:2px solid var(--color-text-primary,var(--fb-ink));outline-offset:2px}
@media (min-width:560px){.card{padding:20px}.swatches{grid-template-columns:repeat(6,minmax(0,1fr))}.btn{width:auto;align-self:flex-start}}
`;

export const CARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seasonly</title>
<style>${STYLE}</style>
</head>
<body>
<main id="card"></main>
<script>${GLUE}</script>
</body>
</html>`;
