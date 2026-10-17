// Generates the animated SVGs used by README.md.
// Run:  node scripts/build-assets.mjs
// Everything that GitHub renders in a README is sanitized (no CSS/JS in markdown),
// but CSS keyframes + SMIL *inside* an SVG image are allowed, so all motion lives here.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets");
mkdirSync(OUT, { recursive: true });

// ───────────────────────────── config ─────────────────────────────
const CONFIG = {
  greeting: "Hi, I'm",
  name: "Jonathan Schroeder",
  phrases: [
    "Full-stack engineer",
    ".NET + TypeScript",
    "Shipping indie SaaS products",
    "Building AI inference apps",
    "Azure · APIs · Stripe",
  ],
  sections: [
    { id: "about", n: "01", title: "About me" },
    { id: "strengths", n: "02", title: "Strengths" },
    { id: "now", n: "03", title: "What I'm building" },
    { id: "toolbox", n: "04", title: "Toolbox" },
    { id: "connect", n: "05", title: "Let's connect" },
  ],
  stack: [
    { group: "Core", color: "#3390e3", light: "#1d6eaf", items: [
      "C#", ".NET", "TypeScript", "JavaScript", "React", "Node.js", "Azure", "Azure Functions",
      "Edge functions", "Stripe", "Docker", "Electron", "REST APIs", "Git", "VS Code",
    ]},
    { group: "AI", color: "#2aa04a", light: "#1f8a3e", items: [
      "OpenAI", "Azure AI Foundry", "Amazon Bedrock", "Claude", "Ollama", "Semantic Kernel", "MCP",
      "RAG + pgvector", "AI agents", "Vector search",
    ]},
    { group: "Databases", color: "#fccd26", light: "#c9a000", items: [
      "PostgreSQL", "SQL Server", "MySQL", "MariaDB", "SQLite", "MongoDB", "Cosmos DB", "DynamoDB", "Redis", "Elasticsearch",
    ]},
  ],
};

// Rough split of where the working time goes. Hand-maintained; edit freely.
// Colors are validated for colorblind-safe adjacency in both modes, including the
// pair that meets at the ring's seam, so keep the order if you change the labels.
const FOCUS = {
  title: "Where the time goes",
  subtitle: "Rough split of a typical month",
  // One blue ramp stepped by share (darker = larger on light, lighter = larger on dark).
  // Validated as an ordinal ramp in both modes; keep the steps if you change labels.
  items: [
    { label: "Product & APIs", value: 40, light: "#1c5cab", dark: "#b7d3f6" },
    { label: "AI inference", value: 30, light: "#2a78d6", dark: "#6da7ec" },
    { label: "Integrations & data", value: 20, light: "#5598e7", dark: "#3987e5" },
    { label: "Infra & ops", value: 10, light: "#86b6ef", dark: "#184f95" },
  ],
};

const CARDS = {
  strengths: [
    { icon: "network", title: "Distributed systems", text: "Services that stay fast and correct when traffic, data, and failure modes all grow at once." },
    { icon: "link", title: "Systems integration", text: "Getting APIs, databases, payment providers, and legacy systems to agree with each other." },
    { icon: "cpu", title: "AI inference & architecture", text: "Choosing the right model, grounding it in real data, and keeping it fast, observable, and affordable." },
  ],
  building: [
    { icon: "sparkles", title: "AI inference apps", text: "Products built around model inference: LLM-powered features, pipelines, and automations that do real work instead of demos." },
    { icon: "briefcase", title: "Tools for small businesses & solopreneurs", text: "Focused products that give small teams and one-person companies the leverage usually reserved for big ones." },
  ],
};

const SANS = `'Segoe UI', Ubuntu, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const MONO = `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, 'Courier New', monospace`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r = (n) => Math.round(n * 1000) / 1000;

// ───────────────────────────── hero ─────────────────────────────
// SwitchCase Studios brand: clover quad (red, blue, yellow, green) on a dark stage.
const BRAND = { red: "#ca1c21", blue: "#3390e3", yellow: "#fccd26", green: "#2aa04a",
  stage: "#0b1016", stage2: "#151d26", onStage: "#f5f7f8", onStageMuted: "#a3afba", stageLine: "#2c3946" };

function hero(theme = "dark") {
  const W = 900, H = 300, dark = theme === "dark";
  const T = dark
    // Backgrounds match GitHub's own page colors so the edges can fade into them.
    ? { bg0: "#0d1117", bg1: "#0d1117", ink: BRAND.onStage, muted: BRAND.onStageMuted, line: BRAND.stageLine, lineOp: 0, veil: "#0d1117", veilOp: [0.35, 0.12, 0], op: 1 }
    : { bg0: "#ffffff", bg1: "#ffffff", ink: "#050709", muted: "#5b6773", line: "#d8dfe6", lineOp: 0, veil: "#ffffff", veilOp: [0.35, 0.12, 0], op: 1, speed: 0.7, sway: 40 };
  T.speed ??= 1; T.sway ??= 30;

  // Constellation: clusters of 2-3 brand-colored data points that pop in, get
  // joined by lines drawing between them, hold, then fade while other clusters
  // form. Pure CSS transform / opacity / stroke-dashoffset, so WebKit is happy.
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const QUAD = ["red", "blue", "yellow", "green"];
  const CLUSTERS = 9, PERIOD = 16;
  // Free zones around the type: right column, the strip above the name, and the
  // strip below the tagline. Each cluster is compact: points within ~110px of a center.
  const zones = { A: [630, 860, 40, 258], B: [90, 600, 34, 64], C: [470, 860, 240, 272] };
  // Deterministic spread: zone pattern plus stratified centers so clusters don't pile up.
  const pattern = ["A", "B", "A", "C", "A", "B", "A", "C", "A"];
  const used = { A: 0, B: 0, C: 0 }, totals = { A: 5, B: 2, C: 2 };
  const clusters = [];
  for (let c = 0; c < CLUSTERS; c++) {
    const n = rnd() < 0.4 ? 2 : 3;
    const key = pattern[c], z = zones[key], k = used[key]++, m = totals[key];
    let cx, cy;
    if (key === "A") { cy = z[2] + ((k + 0.5) / m) * (z[3] - z[2]); cx = z[0] + rnd() * (z[1] - z[0]); }
    else { cx = z[0] + ((k + 0.5) / m) * (z[1] - z[0]) + (rnd() - 0.5) * 80; cy = z[2] + rnd() * (z[3] - z[2]); }
    const spreadX = key === "A" ? 110 : 120, spreadY = key === "A" ? 40 : 18;
    const pts = [];
    let col = Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      let x, y, tries = 0;
      do {
        x = Math.max(z[0], Math.min(z[1], cx + (rnd() * 2 - 1) * spreadX));
        y = Math.max(z[2], Math.min(z[3], cy + (rnd() * 2 - 1) * spreadY));
        tries++;
      } while (tries < 30 && pts.some((q) => Math.hypot(q.x - x, q.y - y) < 40));
      pts.push({ x: r(x), y: r(y), color: QUAD[col] });
      col = (col + 1 + Math.floor(rnd() * 3)) % 4; // always a different color than the last
    }
    clusters.push({ pts, delay: r(-(c * PERIOD) / CLUSTERS), drift: r(4 + rnd() * 8) });
  }
  const constellation = clusters.map((cl, ci) => {
    const lines = cl.pts.slice(1).map((p, i) => {
      const q = cl.pts[i], id = `ln${ci}-${i}`;
      return { q, p, id };
    });
    const gradDefs = lines.map(({ q, p, id }) =>
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${q.x}" y1="${q.y}" x2="${p.x}" y2="${p.y}"><stop offset="0" stop-color="${BRAND[q.color]}"/><stop offset="1" stop-color="${BRAND[p.color]}"/></linearGradient>`).join("");
    const lineEls = lines.map(({ q, p, id }, i) =>
      `<line class="ln l${i + 1}" x1="${q.x}" y1="${q.y}" x2="${p.x}" y2="${p.y}" pathLength="1" stroke="url(#${id})"/>`).join("");
    const ptEls = cl.pts.map((p, i) =>
      `<g class="pt p${i + 1}" style="transform-origin:${p.x}px ${p.y}px"><circle class="ring" cx="${p.x}" cy="${p.y}" r="9" fill="none" stroke="${BRAND[p.color]}" style="transform-origin:${p.x}px ${p.y}px"/><circle cx="${p.x}" cy="${p.y}" r="5.5" fill="${BRAND[p.color]}"/><circle cx="${p.x}" cy="${p.y}" r="5.5" fill="none" stroke="${T.bg0}" stroke-width="1.5"/></g>`).join("");
    return `<defs>${gradDefs}</defs><g class="cl" style="animation-delay:${cl.delay}s;--drift:${cl.drift}px">${lineEls}${ptEls}</g>`;
  }).join("\n    ");

  const stars = Array.from({ length: 26 }, (_, i) => {
    const x = 30 + ((i * 211) % 840), y = 18 + ((i * 97) % 150), rr = 0.7 + (i % 3) * 0.45;
    return `<circle class="star" cx="${x}" cy="${y}" r="${rr}" style="animation-duration:${r(2.4 + (i % 5) * 0.9)}s;animation-delay:${r(-(i * 0.73) % 4)}s"/>`;
  }).join("\n    ");

  const letters = [...CONFIG.name].map((ch, i) =>
    `<tspan class="l" style="animation-delay:${r(0.35 + i * 0.04)}s">${ch === " " ? " " : esc(ch)}</tspan>`).join("");
  // Typing line (per-character SMIL fades; see earlier note on WebKit and clip paths).
  const FS = 20, CW = 12, TX = 84, TY = 216;
  const TYPE = 0.07, HOLD = 1.7, DEL = 0.035, GAP = 0.45;
  const slots = CONFIG.phrases.map((p) => ({ p, total: p.length * (TYPE + DEL) + HOLD + GAP }));
  const cycle = slots.reduce((a, s) => a + s.total, 0);
  const k = (time) => r(Math.min(1, time / cycle));
  let t = 0;
  const cursorEvents = [[0, 0]];
  const phraseSvgs = [];
  slots.forEach((s) => {
    const n = s.p.length;
    const spans = [...s.p].map((ch, i) => {
      const on = t + (i + 1) * TYPE, off = t + n * TYPE + HOLD + (n - i) * DEL;
      cursorEvents.push([on, (i + 1) * CW], [off, i * CW]);
      return `<tspan fill-opacity="0">${esc(ch)}<animate attributeName="fill-opacity" calcMode="discrete" values="0;1;0;0" keyTimes="0;${k(on)};${k(off)};1" dur="${r(cycle)}s" repeatCount="indefinite"/></tspan>`;
    }).join("");
    phraseSvgs.push(`<text class="mono type" x="${TX}" y="${TY}" textLength="${r(n * CW)}" lengthAdjust="spacing">${spans}</text>`);
    t += s.total;
  });
  cursorEvents.sort((a, b) => a[0] - b[0]);
  const cv = cursorEvents.map((e) => e[1]), ck = cursorEvents.map((e) => k(e[0]));
  if (ck[ck.length - 1] !== 1) { cv.push(0); ck.push(1); }

  const quad = [BRAND.red, BRAND.blue, BRAND.yellow, BRAND.green].map((c, i) =>
    `<rect class="q" x="${56 + i * 16}" y="172" width="12" height="3" rx="1.5" fill="${c}" style="animation-delay:${r(1.0 + i * 0.1)}s"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(CONFIG.greeting)} ${esc(CONFIG.name)}">
  <style>
    .sans{font-family:${SANS}}
    .mono{font-family:${MONO}}
    .card{animation:card 1s cubic-bezier(.2,.8,.2,1) both;transform-origin:center}
    @keyframes card{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
    .enter{animation:enter .9s cubic-bezier(.2,.8,.2,1) both}
    @keyframes enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    .hi{fill:${T.muted};font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;opacity:0;animation:fade .7s .15s ease-out forwards}
    @keyframes fade{to{opacity:1}}
    .name{font-size:54px;font-weight:700;fill:${T.ink};letter-spacing:-.025em}
    .l{fill-opacity:0;animation:lin .55s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes lin{to{fill-opacity:1}}
    .period{fill:${BRAND.red};fill-opacity:0;animation:lin .5s 1.15s cubic-bezier(.2,.8,.2,1) forwards}
    .q{transform-box:fill-box;transform-origin:left center;transform:scaleX(0);animation:q .5s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes q{to{transform:scaleX(1)}}
    .type{fill:${T.ink};font-size:${FS}px}
    .cursor{fill:${BRAND.blue};animation:blink 1.1s steps(2,start) infinite}
    @keyframes blink{to{opacity:0}}
    .star{fill:#fff;animation:tw ease-in-out infinite;display:${dark ? "inline" : "none"}}
    @keyframes tw{0%,100%{opacity:.2}50%{opacity:.95}}
    .cl{animation:cl ${PERIOD}s ease-in-out infinite}
    @keyframes cl{0%{opacity:0;transform:translateY(0)}6%{opacity:1}58%{opacity:1}72%{opacity:0}100%{opacity:0;transform:translateY(calc(var(--drift) * -1))}}
    .pt{transform:scale(0);animation:pt ${PERIOD}s cubic-bezier(.2,.8,.2,1.3) infinite;animation-delay:inherit}
    .p1{animation-name:pt1}.p2{animation-name:pt2}.p3{animation-name:pt3}
    @keyframes pt1{0%{transform:scale(0)}5%{transform:scale(1)}100%{transform:scale(1)}}
    @keyframes pt2{0%,16%{transform:scale(0)}21%{transform:scale(1)}100%{transform:scale(1)}}
    @keyframes pt3{0%,30%{transform:scale(0)}35%{transform:scale(1)}100%{transform:scale(1)}}
    .ring{opacity:0;animation:ring ${PERIOD}s ease-out infinite;animation-delay:inherit}
    .p1 .ring{animation-name:ring1}.p2 .ring{animation-name:ring2}.p3 .ring{animation-name:ring3}
    @keyframes ring1{0%,5%{opacity:.6;transform:scale(.6)}14%{opacity:0;transform:scale(2.4)}100%{opacity:0}}
    @keyframes ring2{0%,21%{opacity:.6;transform:scale(.6)}30%{opacity:0;transform:scale(2.4)}100%{opacity:0}}
    @keyframes ring3{0%,35%{opacity:.6;transform:scale(.6)}44%{opacity:0;transform:scale(2.4)}100%{opacity:0}}
    .ln{fill:none;stroke-width:2;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;opacity:${dark ? 0.85 : 0.8};animation:${PERIOD}s ease-in-out infinite;animation-delay:inherit}
    .l1{animation-name:ln1}.l2{animation-name:ln2}
    @keyframes ln1{0%,6%{stroke-dashoffset:1}20%{stroke-dashoffset:0}100%{stroke-dashoffset:0}}
    @keyframes ln2{0%,21%{stroke-dashoffset:1}34%{stroke-dashoffset:0}100%{stroke-dashoffset:0}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.l,.period{fill-opacity:1}.hi{opacity:1}.q{transform:none}.cl{opacity:.8}.pt{transform:none}.ln{stroke-dashoffset:0}}
  </style>
  <defs>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <linearGradient id="stage" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.bg0}"/><stop offset="1" stop-color="${T.bg1}"/></linearGradient>
    <linearGradient id="veilR" x1="0" y1="0" x2="1" y2="0"><stop offset=".66" stop-color="${T.veil}" stop-opacity="0"/><stop offset=".86" stop-color="${T.veil}" stop-opacity=".55"/><stop offset="1" stop-color="${T.veil}" stop-opacity="1"/></linearGradient>
    <linearGradient id="veilT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.veil}" stop-opacity=".9"/><stop offset=".09" stop-color="${T.veil}" stop-opacity="0"/><stop offset=".9" stop-color="${T.veil}" stop-opacity="0"/><stop offset="1" stop-color="${T.veil}" stop-opacity=".7"/></linearGradient>
    <linearGradient id="veil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${T.veil}" stop-opacity="${T.veilOp[0]}"/><stop offset=".45" stop-color="${T.veil}" stop-opacity="${T.veilOp[1]}"/><stop offset=".75" stop-color="${T.veil}" stop-opacity="${T.veilOp[2]}"/></linearGradient>
    <linearGradient id="quadbar" x1="0" x2="1"><stop offset="0" stop-color="${BRAND.red}"/><stop offset=".25" stop-color="${BRAND.red}"/><stop offset=".25" stop-color="${BRAND.blue}"/><stop offset=".5" stop-color="${BRAND.blue}"/><stop offset=".5" stop-color="${BRAND.yellow}"/><stop offset=".75" stop-color="${BRAND.yellow}"/><stop offset=".75" stop-color="${BRAND.green}"/><stop offset="1" stop-color="${BRAND.green}"/></linearGradient>
  </defs>

  <g class="card" clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#stage)"/>
    ${stars}
    <!-- constellation of connecting data points -->
    ${constellation}
    <!-- keep the left side readable, and fade the right, top and bottom into the page -->
    <rect width="${W}" height="${H}" fill="url(#veil)"/>
    <rect width="${W}" height="${H}" fill="url(#veilR)"/>
    <rect width="${W}" height="${H}" fill="url(#veilT)"/>

    <g class="enter">
      <text class="sans hi" x="56" y="92">${esc(CONFIG.greeting)}</text>
      <text class="sans name" x="54" y="150">${letters}<tspan class="period">.</tspan></text>
      ${quad}
      <path d="M58 ${TY - 15} l7 7 -7 7" fill="none" stroke="${BRAND.blue}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      ${phraseSvgs.join("")}
      <rect class="cursor" x="${TX}" y="${TY - FS + 3}" width="9" height="${FS + 2}" rx="1.5">
        <animate attributeName="x" calcMode="discrete" dur="${r(cycle)}s" repeatCount="indefinite" values="${cv.map((v) => r(TX + v)).join(";")}" keyTimes="${ck.join(";")}"/>
      </rect>
      <text class="mono" x="56" y="262" fill="${T.muted}" font-size="12" letter-spacing=".06em">@jonsch</text>
    </g>

    <rect width="${W}" height="${H}" rx="22" fill="none" stroke="${T.line}" stroke-opacity="${T.lineOp}"/>
    <rect x="0" y="${H - 3}" width="${W}" height="3" fill="url(#quadbar)"/>
  </g>
</svg>`;
}

// ───────────────────────────── section headers ─────────────────────────────
function section({ n, title }, theme, idx = 0) {
  const W = 600, H = 60;
  const dark = theme === "dark";
  // Alternate the brand quad: odd sections red -> yellow, even sections green -> blue.
  const warm = idx % 2 === 0;
  const c1 = warm ? BRAND.red : BRAND.green, c2 = warm ? BRAND.yellow : BRAND.blue;
  const numInk = warm ? "#0b1016" : "#ffffff";
  const text = dark ? "#e6edf3" : "#1f2328";
  const sub = dark ? "#8b949e" : "#656d76";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">
  <style>
    .sans{font-family:${SANS}}
    .mono{font-family:${MONO}}
    .in{animation:in .7s cubic-bezier(.2,.8,.2,1) both}
    @keyframes in{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
    .badge{animation:badge .6s .1s cubic-bezier(.2,.8,.2,1.3) both;transform-box:fill-box;transform-origin:center}
    @keyframes badge{from{opacity:0;transform:scale(.5) rotate(-12deg)}to{opacity:1;transform:none}}
    .line{stroke-dasharray:${W};stroke-dashoffset:${W};animation:draw 1.1s .35s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes draw{to{stroke-dashoffset:0}}
    .glow{animation:glow 2.8s ease-in-out infinite}
    @keyframes glow{0%,100%{opacity:.55}50%{opacity:1}}
    .dot{animation:dot 2.6s linear infinite}
    @keyframes dot{to{transform:translateX(${W - 60}px)}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.line{stroke-dashoffset:0}}
  </style>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset=".6" stop-color="${c2}"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></linearGradient>
  </defs>
  <g class="badge">
    <rect x="2" y="8" width="40" height="40" rx="11" fill="url(#g)"/>
    <rect class="glow" x="2" y="8" width="40" height="40" rx="11" fill="none" stroke="#fff" stroke-opacity=".5"/>
    <text class="mono" x="22" y="34" text-anchor="middle" font-size="15" font-weight="700" fill="${numInk}">${esc(n)}</text>
  </g>
  <g class="in">
    <text class="sans" x="56" y="36" font-size="27" font-weight="700" fill="${text}">${esc(title)}</text>
  </g>
  <path class="line" d="M2 56 H ${W - 2}" stroke="url(#fade)" stroke-width="2" stroke-linecap="round"/>
  <circle class="dot" cx="30" cy="56" r="3" fill="${c2}" opacity=".9"/>
</svg>`;
}

// ───────────────────────────── stack chips ─────────────────────────────
function stack(theme) {
  const W = 900, dark = theme === "dark";
  const text = dark ? "#e6edf3" : "#1f2328";
  const label = dark ? "#8b949e" : "#656d76";
  const H_CHIP = 40, GAP = 12, PAD = 16, FS = 15, CHAR = 8.4, LABEL_H = 26, GROUP_GAP = 22;
  let x = 0, y = 0, i = 0;
  const chips = [], clips = [], labels = [], all = [];
  CONFIG.stack.forEach((g, gi) => {
    if (gi > 0) y += H_CHIP + GROUP_GAP;
    labels.push(`<g class="lbl" style="animation-delay:${r(0.05 + i * 0.07)}s"><rect x="2" y="${y + 4}" width="3" height="11" rx="1.5" fill="${dark ? g.color : g.light}"/><text class="mono" x="13" y="${y + 13}" font-size="11" font-weight="600" fill="${label}" letter-spacing=".16em">${esc(g.group.toUpperCase())}</text></g>`);
    y += LABEL_H; x = 0;
    const gcolor = dark ? g.color : g.light;
    g.items.forEach((name) => {
      const color = gcolor;
      all.push(name);
      const tw = name.length * CHAR;
      const w = PAD + 10 + 10 + tw + PAD;
      if (x + w > W) { x = 0; y += H_CHIP + GAP; }
      const delay = r(0.1 + i * 0.045);
      const c = color;
      clips.push(`<rect x="${x}" y="${y}" width="${r(w)}" height="${H_CHIP}" rx="20"/>`);
      chips.push(`
  <g class="chip" style="animation-delay:${delay}s">
    <rect x="${x}" y="${y}" width="${r(w)}" height="${H_CHIP}" rx="20" fill="${c}" fill-opacity="${dark ? 0.16 : 0.13}" stroke="${c}" stroke-opacity="${dark ? 0.6 : 0.5}" stroke-width="1.2"/>
    <circle class="dot" cx="${x + PAD + 5}" cy="${y + H_CHIP / 2}" r="5" fill="${c}" style="animation-delay:${r(-i * 0.31)}s"/>
    <text class="sans" x="${x + PAD + 20}" y="${y + H_CHIP / 2 + FS * 0.36}" font-size="${FS}" font-weight="600" fill="${text}">${esc(name)}</text>
  </g>`);
      x += w + GAP; i++;
    });
  });
  const H = y + H_CHIP + 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Toolbox: ${esc(all.join(", "))}">
  <style>
    .sans{font-family:${SANS}}
    .mono{font-family:${MONO}}
    .lbl{opacity:0;animation:fade .6s ease-out forwards}
    @keyframes fade{to{opacity:1}}
    .chip{opacity:0;animation:pop .6s cubic-bezier(.2,.8,.2,1.25) forwards;transform-box:fill-box;transform-origin:center}
    @keyframes pop{from{opacity:0;transform:translateY(14px) scale(.8)}to{opacity:1;transform:none}}
    .dot{animation:breathe 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
    @keyframes breathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.35);opacity:1}}
    .sheen{animation:sheen 5.5s 1.6s ease-in-out infinite both}
    @keyframes sheen{0%{transform:translateX(-260px) skewX(-18deg)}35%,100%{transform:translateX(${W + 260}px) skewX(-18deg)}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.chip,.lbl{opacity:1}}
  </style>
  <defs>
    <clipPath id="chips">${clips.join("")}</clipPath>
    <linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${dark ? 0.22 : 0.55}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  ${labels.join("\n  ")}
  ${chips.join("")}
  <g clip-path="url(#chips)"><rect class="sheen" x="0" y="-10" width="140" height="${H + 20}" fill="url(#sh)"/></g>
</svg>`;
}

// ───────────────────────────── cards ─────────────────────────────
const ICONS = {
  network: `<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.3 11l9.4-4M7.3 13l9.4 4"/>`,
  link: `<path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/>`,
  cpu: `<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 1.5v3.5M15 1.5v3.5M9 19v3.5M15 19v3.5M1.5 9h3.5M1.5 15h3.5M19 9h3.5M19 15h3.5"/>`,
  sparkles: `<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>`,
  briefcase: `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M2 13h20"/>`,
};

function wrap(text, maxChars) {
  const words = text.split(" "), lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) { lines.push(line.trim()); line = w; }
    else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

function cards(items, theme) {
  const W = 900, GAP = 16, PAD = 22, dark = theme === "dark";
  const n = items.length, CW = (W - GAP * (n - 1)) / n;
  const fg = dark ? "#e6edf3" : "#1f2328", muted = dark ? "#9da7b3" : "#59636e";
  const fill = dark ? "#ffffff" : "#0f172a", fillOp = dark ? 0.04 : 0.03;
  const line = dark ? "#ffffff" : "#0f172a", lineOp = dark ? 0.12 : 0.12;
  const TITLE = 17, BODY = 14, LH = 21;
  const titleChars = Math.floor((CW - PAD * 2) / (TITLE * 0.52));
  const bodyChars = Math.floor((CW - PAD * 2) / (BODY * 0.5));
  const laid = items.map((it) => ({ ...it, t: wrap(it.title, titleChars), b: wrap(it.text, bodyChars) }));
  const maxT = Math.max(...laid.map((c) => c.t.length)), maxB = Math.max(...laid.map((c) => c.b.length));
  const H = PAD + 40 + 18 + maxT * (TITLE + 4) + 8 + maxB * LH + PAD - 4;
  const body = laid.map((c, i) => {
    const x = i * (CW + GAP);
    let y = PAD + 40 + 18 + TITLE - 4;
    const title = c.t.map((l, j) => `<text class="sans" x="${r(x + PAD)}" y="${y + j * (TITLE + 4)}" font-size="${TITLE}" font-weight="700" fill="${fg}">${esc(l)}</text>`).join("");
    y += c.t.length * (TITLE + 4) + 8 + BODY - 4;
    const text = c.b.map((l, j) => `<text class="sans" x="${r(x + PAD)}" y="${y + j * LH}" font-size="${BODY}" fill="${muted}">${esc(l)}</text>`).join("");
    return `
  <g class="card" style="animation-delay:${r(0.1 + i * 0.14)}s">
    <rect x="${r(x)}" y="0" width="${r(CW)}" height="${H}" rx="16" fill="${fill}" fill-opacity="${fillOp}" stroke="${line}" stroke-opacity="${lineOp}"/>
    <path class="top" d="M${r(x + 16)} 0.5 H${r(x + CW - 16)}" stroke="url(#acc)" stroke-width="2" stroke-linecap="round" style="animation-delay:${r(0.35 + i * 0.14)}s"/>
    <rect x="${r(x + PAD)}" y="${PAD}" width="40" height="40" rx="11" fill="url(#acc)" fill-opacity="${dark ? 0.18 : 0.14}"/>
    <rect class="glow" x="${r(x + PAD)}" y="${PAD}" width="40" height="40" rx="11" fill="none" stroke="url(#acc)" stroke-opacity=".7" style="animation-delay:${r(-i * 0.9)}s"/>
    <g transform="translate(${r(x + PAD + 8)} ${PAD + 8})" fill="none" stroke="${dark ? "#7cb9ee" : "#1d6eaf"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.icon]}</g>
    ${title}${text}
  </g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 1}" width="${W}" height="${H + 1}" role="img" aria-label="${esc(items.map((c) => c.title + ": " + c.text).join(" "))}">
  <style>
    .sans{font-family:${SANS}}
    .card{opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    .top{stroke-dasharray:${r(CW)};stroke-dashoffset:${r(CW)};animation:draw 1s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes draw{to{stroke-dashoffset:0}}
    .glow{animation:glow 3.2s ease-in-out infinite}
    @keyframes glow{0%,100%{opacity:.35}50%{opacity:1}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.card{opacity:1}.top{stroke-dashoffset:0}}
  </style>
  <defs>
    <linearGradient id="acc" x1="0" x2="1"><stop offset="0" stop-color="#3390e3"/><stop offset="1" stop-color="#2aa04a"/></linearGradient>
  </defs>${body}
</svg>`;
}

// ───────────────────────────── focus donut ─────────────────────────────
function focus(theme, idp = "f") {
  const W = 900, H = 232, dark = theme === "dark";
  const fg = dark ? "#e6edf3" : "#1f2328", muted = dark ? "#9da7b3" : "#59636e", sub = dark ? "#c9d1d9" : "#424a53";
  const fill = dark ? "#ffffff" : "#0f172a", fillOp = dark ? 0.04 : 0.03, line = dark ? "#ffffff" : "#0f172a";
  const CX = 150, CY = 116, R = 72, SW = 18, GAP_DEG = 2.4;
  const total = FOCUS.items.reduce((a, i) => a + i.value, 0);
  const pol = (deg) => { const a = (deg - 90) * Math.PI / 180; return [r(CX + R * Math.cos(a)), r(CY + R * Math.sin(a))]; };
  let cum = 0, delay = 0.25;
  const TOTAL_DUR = 1.6;
  const arcs = FOCUS.items.map((it, i) => {
    const share = it.value / total;
    const a0 = cum * 360 + GAP_DEG / 2, a1 = (cum + share) * 360 - GAP_DEG / 2;
    const [x0, y0] = pol(a0), [x1, y1] = pol(a1);
    const len = r(R * (a1 - a0) * Math.PI / 180), large = a1 - a0 > 180 ? 1 : 0;
    const dur = r(TOTAL_DUR * share);
    const color = dark ? it.dark : it.light;
    const el = `<path class="arc" d="M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="${SW}" style="stroke-dasharray:${len};stroke-dashoffset:${len};animation-duration:${dur}s;animation-delay:${r(delay)}s"><title>${esc(it.label)}: ${it.value}%</title></path>`;
    cum += share; delay += dur;
    return el;
  }).join("\n    ");
  const top = FOCUS.items[0];
  const LX = 330, LW = 540, rowY = 106, rowH = 31;
  const rows = FOCUS.items.map((it, i) => {
    const y = rowY + i * rowH, color = dark ? it.dark : it.light;
    return `<g class="row" style="animation-delay:${r(0.5 + i * 0.12)}s">
      <rect x="${LX}" y="${y - 10}" width="11" height="11" rx="3" fill="${color}"/>
      <text class="sans" x="${LX + 22}" y="${y}" font-size="14" font-weight="500" fill="${fg}">${esc(it.label)}</text>
      <text class="mono" x="${LX + LW}" y="${y}" text-anchor="end" font-size="13" fill="${sub}">${it.value}%</text>
      ${i < FOCUS.items.length - 1 ? `<path d="M${LX} ${y + 11} H${LX + LW}" stroke="${line}" stroke-opacity=".1"/>` : ""}
    </g>`;
  }).join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(FOCUS.title)}. ${esc(FOCUS.items.map((i) => i.label + " " + i.value + "%").join(", "))}.">
  <style>
    .sans{font-family:${SANS}}
    .mono{font-family:${MONO}}
    .arc{animation:sweep ease-out forwards}
    @keyframes sweep{to{stroke-dashoffset:0}}
    .center{opacity:0;animation:fade .6s 1.5s ease-out forwards}
    .row{opacity:0;animation:rowin .6s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes rowin{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}
    .hd{opacity:0;animation:fade .6s .1s ease-out forwards}
    @keyframes fade{to{opacity:1}}
    .panel{animation:up .7s cubic-bezier(.2,.8,.2,1) both}
    @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.arc{stroke-dashoffset:0!important}.center,.row,.hd{opacity:1}}
  </style>
  <defs><linearGradient id="${idp}acc" x1="0" x2="1"><stop offset="0" stop-color="#3390e3"/><stop offset="1" stop-color="#2aa04a"/></linearGradient></defs>
  <g class="panel">
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${fill}" fill-opacity="${fillOp}" stroke="${line}" stroke-opacity=".12"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${line}" stroke-opacity=".06" stroke-width="${SW}"/>
    ${arcs}
    <g class="center">
      <text class="sans" x="${CX}" y="${CY + 4}" text-anchor="middle" font-size="30" font-weight="700" fill="${fg}">${top.value}%</text>
      <text class="sans" x="${CX}" y="${CY + 24}" text-anchor="middle" font-size="12" fill="${muted}">${esc(top.label)}</text>
    </g>
    <g class="hd">
      <text class="sans" x="${LX}" y="48" font-size="18" font-weight="700" fill="${fg}">${esc(FOCUS.title)}</text>
      <text class="sans" x="${LX}" y="70" font-size="13" fill="${muted}">${esc(FOCUS.subtitle)}</text>
    </g>
    ${rows}
  </g>
</svg>`;
}

// ───────────────────────────── footer ─────────────────────────────
function footer(theme) {
  const W = 900, H = 56, dark = theme === "dark";
  const muted = dark ? "#8b949e" : "#656d76";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="github.com/jonsch">
  <style>
    .mono{font-family:${MONO}}
    .flow{animation:flow 4s linear infinite}
    @keyframes flow{to{transform:translateX(${W}px)}}
    .txt{opacity:0;animation:fade 1s .4s forwards}
    @keyframes fade{to{opacity:1}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.txt{opacity:1}}
  </style>
  <defs>
    <linearGradient id="base" x1="0" x2="1"><stop offset="0" stop-color="#3390e3" stop-opacity="0"/><stop offset=".5" stop-color="#3390e3" stop-opacity=".5"/><stop offset="1" stop-color="#2aa04a" stop-opacity="0"/></linearGradient>
    <linearGradient id="pulse" x1="0" x2="1"><stop offset="0" stop-color="#2aa04a" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity="${dark ? 0.9 : 0.6}"/><stop offset="1" stop-color="#2aa04a" stop-opacity="0"/></linearGradient>
    <clipPath id="c"><rect width="${W}" height="${H}"/></clipPath>
  </defs>
  <rect y="12" width="${W}" height="1.5" fill="url(#base)"/>
  <g clip-path="url(#c)"><rect class="flow" x="-${W}" y="11.5" width="${W}" height="2.5" rx="1" fill="url(#pulse)"/></g>
  <text class="mono txt" x="${W / 2}" y="42" text-anchor="middle" font-size="12" letter-spacing=".12em" fill="${muted}">GITHUB.COM/JONSCH</text>
</svg>`;
}

// ───────────────────────────── write ─────────────────────────────
const files = {
  "hero-dark.svg": hero("dark"),
  "hero-light.svg": hero("light"),
  "stack-dark.svg": stack("dark"),
  "stack-light.svg": stack("light"),
  "cards-strengths-dark.svg": cards(CARDS.strengths, "dark"),
  "cards-strengths-light.svg": cards(CARDS.strengths, "light"),
  "cards-building-dark.svg": cards(CARDS.building, "dark"),
  "cards-building-light.svg": cards(CARDS.building, "light"),
  "focus-dark.svg": focus("dark"),
  "focus-light.svg": focus("light"),
  "footer-dark.svg": footer("dark"),
  "footer-light.svg": footer("light"),
};
CONFIG.sections.forEach((s, i) => {
  files[`section-${s.id}-dark.svg`] = section(s, "dark", i);
  files[`section-${s.id}-light.svg`] = section(s, "light", i);
});
for (const [name, svg] of Object.entries(files)) {
  writeFileSync(join(OUT, name), svg.trim() + "\n");
  console.log("wrote assets/" + name);
}

// Cache-bust README image URLs. GitHub proxies README images through its camo
// cache keyed on the full URL, so a changed SVG at the same path keeps showing
// the old render for a long time. Appending a content hash makes every
// regeneration a fresh URL.
const readmePath = join(ROOT, "README.md");
let readme = readFileSync(readmePath, "utf8");
for (const [name, svg] of Object.entries(files)) {
  const hash = createHash("sha1").update(svg).digest("hex").slice(0, 8);
  readme = readme.replace(new RegExp(`assets/${name.replace(".", "\\.")}(\\?v=[0-9a-f]+)?`, "g"), `assets/${name}?v=${hash}`);
}
writeFileSync(readmePath, readme);
console.log("updated README.md image versions");

// Inline the focus chart into the Pages site (between the markers) so hover works there.
const sitePath = join(ROOT, "docs", "index.html");
let site = readFileSync(sitePath, "utf8");
const inlineSvg = (svg) => svg.replace(/^<svg /, '<svg width="100%" height="auto" ').replace(/ width="900" height="232"/, "");
site = site.replace(/(<!-- focus-chart:start -->)[\s\S]*?(<!-- focus-chart:end -->)/,
  `$1\n<div class="chart chart-dark">${inlineSvg(focus("dark", "fd"))}</div>\n<div class="chart chart-light">${inlineSvg(focus("light", "fl"))}</div>\n$2`);
writeFileSync(sitePath, site);
console.log("injected focus chart into docs/index.html");
