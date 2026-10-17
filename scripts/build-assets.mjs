// Generates the animated SVGs used by README.md.
// Run:  node scripts/build-assets.mjs
// Everything that GitHub renders in a README is sanitized (no CSS/JS in markdown),
// but CSS keyframes + SMIL *inside* an SVG image are allowed, so all motion lives here.

import { writeFileSync, mkdirSync } from "node:fs";
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
    { id: "toolbox", n: "02", title: "Toolbox" },
    { id: "strengths", n: "03", title: "Strengths" },
    { id: "now", n: "04", title: "What I'm building" },
    { id: "connect", n: "05", title: "Let's connect" },
  ],
  stack: [
    ["C#", "#a78bfa"],
    [".NET", "#8b5cf6"],
    ["TypeScript", "#3b82f6"],
    ["JavaScript", "#facc15"],
    ["React", "#22d3ee"],
    ["Node.js", "#4ade80"],
    ["Azure", "#38bdf8"],
    ["Azure Functions", "#fbbf24"],
    ["SQL Server", "#f87171"],
    ["PostgreSQL", "#60a5fa"],
    ["LLM APIs", "#f472b6"],
    ["Stripe", "#818cf8"],
    ["Docker", "#2dd4bf"],
    ["Electron", "#67e8f9"],
    ["REST APIs", "#34d399"],
    ["Git", "#fb923c"],
    ["VS Code", "#0ea5e9"],
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
  const H_CHIP = 40, GAP = 12, PAD = 16, FS = 15, CHAR = 8.4;
  let x = 0, y = 0;
  const chips = [], clips = [];
  CONFIG.stack.forEach(([label, color], i) => {
    const tw = label.length * CHAR;
    const w = PAD + 10 + 10 + tw + PAD;
    if (x + w > W) { x = 0; y += H_CHIP + GAP; }
    const delay = r(0.1 + i * 0.07);
    clips.push(`<rect x="${x}" y="${y}" width="${r(w)}" height="${H_CHIP}" rx="20"/>`);
    chips.push(`
  <g class="chip" style="animation-delay:${delay}s">
    <rect x="${x}" y="${y}" width="${r(w)}" height="${H_CHIP}" rx="20" fill="${color}" fill-opacity="${dark ? 0.16 : 0.13}" stroke="${color}" stroke-opacity="${dark ? 0.6 : 0.5}" stroke-width="1.2"/>
    <circle class="dot" cx="${x + PAD + 5}" cy="${y + H_CHIP / 2}" r="5" fill="${color}" style="animation-delay:${r(-i * 0.31)}s"/>
    <text class="sans" x="${x + PAD + 20}" y="${y + H_CHIP / 2 + FS * 0.36}" font-size="${FS}" font-weight="600" fill="${text}">${esc(label)}</text>
  </g>`);
    x += w + GAP;
  });
  const H = y + H_CHIP + 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Toolbox: ${esc(CONFIG.stack.map((s) => s[0]).join(", "))}">
  <style>
    .sans{font-family:${SANS}}
    .chip{opacity:0;animation:pop .6s cubic-bezier(.2,.8,.2,1.25) forwards;transform-box:fill-box;transform-origin:center}
    @keyframes pop{from{opacity:0;transform:translateY(14px) scale(.8)}to{opacity:1;transform:none}}
    .dot{animation:breathe 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
    @keyframes breathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.35);opacity:1}}
    .sheen{animation:sheen 5.5s 1.6s ease-in-out infinite both}
    @keyframes sheen{0%{transform:translateX(-260px) skewX(-18deg)}35%,100%{transform:translateX(${W + 260}px) skewX(-18deg)}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.chip{opacity:1}}
  </style>
  <defs>
    <clipPath id="chips">${clips.join("")}</clipPath>
    <linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${dark ? 0.22 : 0.55}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  ${chips.join("")}
  <g clip-path="url(#chips)"><rect class="sheen" x="0" y="-10" width="140" height="${H + 20}" fill="url(#sh)"/></g>
</svg>`;
}

// ───────────────────────────── wave footer ─────────────────────────────
function wave() {
  const W = 900, H = 110;
  const path = (a) => `M0 ${55 + a} C150 ${15 + a} 300 ${95 - a} 450 ${55} S750 ${15 + a} 900 55 S1200 ${95 - a} 1350 55 S1650 ${15 + a} 1800 55 V${H} H0 Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Thanks for stopping by">
  <style>
    .w{animation:w linear infinite}
    @keyframes w{to{transform:translateX(-900px)}}
    .sans{font-family:${SANS}}
    .txt{animation:fade 1s .3s both}
    @keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .arrow{animation:bob 1.6s ease-in-out infinite}
    @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>
  <defs>
    <linearGradient id="w1" x1="0" x2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset=".5" stop-color="#22d3ee"/><stop offset="1" stop-color="#ec4899"/></linearGradient>
    <linearGradient id="w2" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
    <clipPath id="c"><rect width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#c)">
    <path class="w" d="${path(8)}" fill="url(#w2)" opacity=".45" style="animation-duration:11s"/>
    <path class="w" d="${path(0)}" fill="url(#w1)" opacity=".9" style="animation-duration:7s"/>
    <g class="txt">
      <text class="sans" x="${W / 2}" y="86" text-anchor="middle" font-size="16" font-weight="700" fill="#fff" fill-opacity=".95" letter-spacing=".08em">THANKS FOR STOPPING BY</text>
    </g>
  </g>
</svg>`;
}

// ───────────────────────────── write ─────────────────────────────
const files = {
  "hero.svg": hero(),
  "stack-dark.svg": stack("dark"),
  "stack-light.svg": stack("light"),
  "wave.svg": wave(),
};
for (const s of CONFIG.sections) {
  files[`section-${s.id}-dark.svg`] = section(s, "dark");
  files[`section-${s.id}-light.svg`] = section(s, "light");
}
for (const [name, svg] of Object.entries(files)) {
  writeFileSync(join(OUT, name), svg.trim() + "\n");
  console.log("wrote assets/" + name);
}
