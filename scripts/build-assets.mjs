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
    { group: "Core", items: [
      ["C#", "#a78bfa"], [".NET", "#8b5cf6"], ["TypeScript", "#3b82f6"], ["JavaScript", "#facc15"],
      ["React", "#22d3ee"], ["Node.js", "#4ade80"], ["Azure", "#38bdf8"], ["Azure Functions", "#fbbf24"],
      ["Edge functions", "#fb923c"], ["Stripe", "#818cf8"], ["Docker", "#2dd4bf"], ["Electron", "#67e8f9"],
      ["REST APIs", "#34d399"], ["Git", "#f05032"], ["VS Code", "#0ea5e9"],
    ]},
    { group: "AI", items: [
      ["OpenAI", "#10a37f"], ["Azure AI Foundry", "#0ea5e9"], ["Amazon Bedrock", "#ff9900"], ["Claude", "#d97757"],
      ["Ollama", "#e2e8f0"], ["Semantic Kernel", "#a78bfa"], ["MCP", "#c084fc"], ["RAG + pgvector", "#60a5fa"],
      ["AI agents", "#f472b6"], ["Vector search", "#2dd4bf"],
    ]},
    { group: "Databases", items: [
      ["PostgreSQL", "#60a5fa"], ["SQL Server", "#f87171"], ["MySQL", "#38bdf8"], ["MariaDB", "#a16207"],
      ["SQLite", "#7dd3fc"], ["MongoDB", "#4ade80"], ["Cosmos DB", "#22d3ee"], ["DynamoDB", "#818cf8"],
      ["Redis", "#ef4444"], ["Elasticsearch", "#fbbf24"],
    ]},
  ],
};

// Rough split of where the working time goes. Hand-maintained; edit freely.
// Colors are validated for colorblind-safe adjacency in both modes, including the
// pair that meets at the ring's seam, so keep the order if you change the labels.
const FOCUS = {
  title: "Where the time goes",
  subtitle: "Rough split of a typical month",
  items: [
    { label: "Product & APIs", value: 40, light: "#7c3aed", dark: "#8b5cf6" },
    { label: "AI inference", value: 30, light: "#d97706", dark: "#c98500" },
    { label: "Integrations & data", value: 20, light: "#0891b2", dark: "#0891b2" },
    { label: "Infra & ops", value: 10, light: "#db2777", dark: "#db2777" },
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
function hero() {
  const W = 900, H = 300;

  // Name: each letter is a <tspan> that fades in (fill-opacity, since plain
  // opacity does not apply to tspans). Whole text group also rises in.
  const letters = [...CONFIG.name]
    .map((ch, i) =>
      ch === " "
        ? `<tspan class="l" style="animation-delay:${r(0.35 + i * 0.045)}s"> </tspan>`
        : `<tspan class="l" style="animation-delay:${r(0.35 + i * 0.045)}s">${esc(ch)}</tspan>`
    )
    .join("");

  // Typing effect. Every character is its own <tspan> whose fill-opacity is
  // switched on/off by SMIL, so no animated clip-path is needed (WebKit does not
  // repaint those reliably). textLength pins every glyph to exactly CW units so
  // the cursor position is predictable regardless of which monospace font loads.
  const FS = 21, CW = 12.6, TX = 82, TY = 212;
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
      const on = t + (i + 1) * TYPE;                       // appears when typed
      const off = t + n * TYPE + HOLD + (n - i) * DEL;     // disappears on backspace (last char first)
      cursorEvents.push([on, (i + 1) * CW], [off, i * CW]);
      return `<tspan fill-opacity="0">${esc(ch)}<animate attributeName="fill-opacity" calcMode="discrete" values="0;1;0;0" keyTimes="0;${k(on)};${k(off)};1" dur="${r(cycle)}s" repeatCount="indefinite"/></tspan>`;
    }).join("");
    phraseSvgs.push(`<text class="type" x="${TX}" y="${TY}" textLength="${r(n * CW)}" lengthAdjust="spacing">${spans}</text>`);
    t += s.total;
  });
  cursorEvents.sort((a, b) => a[0] - b[0]);
  const cv = cursorEvents.map((e) => e[1]), ck = cursorEvents.map((e) => k(e[0]));
  if (ck[ck.length - 1] !== 1) { cv.push(0); ck.push(1); }

  const particles = Array.from({ length: 14 }, (_, i) => {
    const x = 40 + ((i * 173) % 820), d = 7 + (i % 5) * 1.7, delay = -(i * 1.37) % d, rr = 1.2 + (i % 3) * 0.8;
    return `<circle class="p" cx="${x}" cy="${H + 10}" r="${rr}" style="animation-duration:${r(d)}s;animation-delay:${r(delay)}s"/>`;
  }).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(CONFIG.greeting)} ${esc(CONFIG.name)}">
  <style>
    .sans{font-family:${SANS}}
    .mono{font-family:${MONO}}
    .enter{animation:enter .9s cubic-bezier(.2,.8,.2,1) both}
    @keyframes enter{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    .hi{fill:#67e8f9;font-size:17px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;opacity:0;animation:fade .7s .15s ease-out forwards}
    @keyframes fade{to{opacity:1}}
    .name{font-size:54px;font-weight:700;fill:url(#nameGrad);letter-spacing:-.01em}
    .l{fill-opacity:0;animation:lin .55s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes lin{from{fill-opacity:0}to{fill-opacity:1}}
    .type{fill:#e2e8f0;font-size:${FS}px}
    .cursor{fill:#67e8f9;animation:blink 1.1s steps(2,start) infinite}
    @keyframes blink{to{opacity:0}}
    .p{fill:#fff;opacity:0;animation:rise linear infinite}
    @keyframes rise{0%{transform:translateY(0);opacity:0}10%{opacity:.5}90%{opacity:.35}100%{transform:translateY(-${H + 40}px);opacity:0}}
    .ring{fill:none;stroke:#8b5cf6;stroke-opacity:.45;stroke-width:1.2;stroke-dasharray:4 6}
    .spin{transform-origin:772px 150px;animation:spin linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .rev{animation-direction:reverse}
    .core{animation:pulse 3s ease-in-out infinite;transform-origin:772px 150px}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
    .bar{animation:slide 3s linear infinite}
    @keyframes slide{to{transform:translateX(${W}px)}}
    .card{animation:card 1s cubic-bezier(.2,.8,.2,1) both}
    @keyframes card{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
    .blob{filter:url(#blur)}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.l{fill-opacity:1}.hi{opacity:1}}
  </style>
  <defs>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="42"/></filter>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#101a33"/>
    </linearGradient>
    <linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c4b5fd"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#67e8f9"/>
      <animate attributeName="x1" values="-1;1" dur="4s" repeatCount="indefinite"/>
      <animate attributeName="x2" values="0;2" dur="4s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="barGrad" x1="0" x2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0"/><stop offset=".5" stop-color="#67e8f9"/><stop offset="1" stop-color="#ec4899" stop-opacity="0"/></linearGradient>
    <radialGradient id="coreGrad"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#c4b5fd"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M36 0H0V36" fill="none" stroke="#ffffff" stroke-opacity=".05"/>
    </pattern>
  </defs>

  <g class="card" style="transform-origin:center" clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <g class="blob" opacity=".6">
      <circle r="150" fill="#7c3aed"><animate attributeName="cx" values="120;260;80;120" dur="16s" repeatCount="indefinite"/><animate attributeName="cy" values="60;200;140;60" dur="16s" repeatCount="indefinite"/></circle>
      <circle r="130" fill="#06b6d4"><animate attributeName="cx" values="560;420;640;560" dur="19s" repeatCount="indefinite"/><animate attributeName="cy" values="300;120;260;300" dur="19s" repeatCount="indefinite"/></circle>
      <circle r="120" fill="#ec4899"><animate attributeName="cx" values="860;720;880;860" dur="21s" repeatCount="indefinite"/><animate attributeName="cy" values="40;160;240;40" dur="21s" repeatCount="indefinite"/></circle>
    </g>
    <rect width="${W}" height="${H}" fill="url(#grid)"/>
    ${particles}
    <rect width="${W}" height="${H}" rx="22" fill="none" stroke="#ffffff" stroke-opacity=".12"/>

    <!-- orbit decoration -->
    <g>
      <circle class="ring" cx="772" cy="150" r="42"/>
      <circle class="ring" cx="772" cy="150" r="68" stroke="#22d3ee"/>
      <circle class="ring" cx="772" cy="150" r="94" stroke="#ec4899"/>
      <g class="spin" style="animation-duration:9s"><circle cx="814" cy="150" r="4" fill="#c4b5fd"/></g>
      <g class="spin rev" style="animation-duration:14s"><circle cx="840" cy="150" r="4.5" fill="#67e8f9"/></g>
      <g class="spin" style="animation-duration:22s"><circle cx="866" cy="150" r="3.5" fill="#f9a8d4"/></g>
      <circle class="core" cx="772" cy="150" r="22" fill="url(#coreGrad)"/>
    </g>

    <g class="enter">
      <text class="sans hi" x="56" y="96">${esc(CONFIG.greeting)}</text>
      <text class="sans name" x="54" y="152">${letters}</text>
      <path class="chev" d="M58 ${TY - 15} l7 7 -7 7" fill="none" stroke="#a78bfa" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      ${phraseSvgs.join("")}
      <rect class="cursor" x="${TX}" y="${TY - FS + 3}" width="10" height="${FS + 2}" rx="1.5">
        <animate attributeName="x" calcMode="discrete" dur="${r(cycle)}s" repeatCount="indefinite"
          values="${cv.map((v) => r(TX + v)).join(";")}" keyTimes="${ck.join(";")}"/>
      </rect>
      <text class="mono" x="56" y="262" fill="#94a3b8" font-size="13" letter-spacing=".06em">@jonsch  ·  building things for the web since 2012</text>
    </g>

    <g clip-path="url(#card)">
      <rect class="bar" x="-${W}" y="${H - 3}" width="${W}" height="3" fill="url(#barGrad)"/>
    </g>
  </g>
</svg>`;
}

// ───────────────────────────── section headers ─────────────────────────────
function section({ n, title }, theme) {
  const W = 600, H = 60;
  const dark = theme === "dark";
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
    <linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
    <linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0"><stop offset="0" stop-color="#8b5cf6"/><stop offset=".6" stop-color="#22d3ee"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient>
  </defs>
  <g class="badge">
    <rect x="2" y="8" width="40" height="40" rx="11" fill="url(#g)"/>
    <rect class="glow" x="2" y="8" width="40" height="40" rx="11" fill="none" stroke="#fff" stroke-opacity=".5"/>
    <text class="mono" x="22" y="34" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">${esc(n)}</text>
  </g>
  <g class="in">
    <text class="sans" x="56" y="36" font-size="27" font-weight="700" fill="${text}">${esc(title)}</text>
  </g>
  <path class="line" d="M2 56 H ${W - 2}" stroke="url(#fade)" stroke-width="2" stroke-linecap="round"/>
  <circle class="dot" cx="30" cy="56" r="3" fill="#22d3ee" opacity=".9"/>
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
    labels.push(`<text class="mono lbl" x="2" y="${y + 13}" font-size="11" font-weight="600" fill="${label}" letter-spacing=".16em" style="animation-delay:${r(0.05 + i * 0.07)}s">${esc(g.group.toUpperCase())}</text>`);
    y += LABEL_H; x = 0;
    g.items.forEach(([name, color]) => {
      all.push(name);
      const tw = name.length * CHAR;
      const w = PAD + 10 + 10 + tw + PAD;
      if (x + w > W) { x = 0; y += H_CHIP + GAP; }
      const delay = r(0.1 + i * 0.045);
      // light theme: keep near-white chip colors legible
      const c = !dark && color === "#e2e8f0" ? "#64748b" : color;
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
    <g transform="translate(${r(x + PAD + 8)} ${PAD + 8})" fill="none" stroke="${dark ? "#c4b5fd" : "#6d28d9"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.icon]}</g>
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
    <linearGradient id="acc" x1="0" x2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
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
  <defs><linearGradient id="${idp}acc" x1="0" x2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
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
    <linearGradient id="base" x1="0" x2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0"/><stop offset=".5" stop-color="#8b5cf6" stop-opacity=".5"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient>
    <linearGradient id="pulse" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity="${dark ? 0.9 : 0.6}"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient>
    <clipPath id="c"><rect width="${W}" height="${H}"/></clipPath>
  </defs>
  <rect y="12" width="${W}" height="1.5" fill="url(#base)"/>
  <g clip-path="url(#c)"><rect class="flow" x="-${W}" y="11.5" width="${W}" height="2.5" rx="1" fill="url(#pulse)"/></g>
  <text class="mono txt" x="${W / 2}" y="42" text-anchor="middle" font-size="12" letter-spacing=".12em" fill="${muted}">GITHUB.COM/JONSCH</text>
</svg>`;
}

// ───────────────────────────── write ─────────────────────────────
const files = {
  "hero.svg": hero(),
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
for (const s of CONFIG.sections) {
  files[`section-${s.id}-dark.svg`] = section(s, "dark");
  files[`section-${s.id}-light.svg`] = section(s, "light");
}
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
