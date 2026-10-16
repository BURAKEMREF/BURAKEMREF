// Builds the static SVG artwork of the profile README into ../assets.
// Run: node scripts/build-assets.mjs
//
// Rules for everything generated here:
// - GitHub shows README images through <img>, so no script runs: motion is CSS keyframes + SMIL only.
// - No external fonts or files (an SVG image cannot load them): system font stacks only.
// - Every animation respects prefers-reduced-motion.
// - viewBox based, so each file scales with the README column (and on mobile).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(OUT, { recursive: true });

// Palette: deep navy / black, turquoise, electric blue.
const C = {
  bg0: "#03060d",
  bg1: "#0a1630",
  card: "#070d1a",
  cardHi: "#0b1527",
  border: "#1a2840",
  ink: "#eef4ff",
  ink2: "#d5e2f8",
  muted: "#8fa6c8",
  subtle: "#6b83a8",
  turq: "#2ee6d6",
  turqSoft: "#7ff5ec",
  blue: "#3d7bff",
  grid: "#8fb4ff",
};
const SANS = "'Segoe UI Variable Display','Segoe UI',-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',Inter,Roboto,Arial,sans-serif";
const MONO = "'JetBrains Mono','Cascadia Code','SF Mono',Menlo,Consolas,'Liberation Mono',monospace";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const write = (name, svg) => {
  const clean = svg.replace(/\n\s*\n/g, "\n").trim() + "\n";
  writeFileSync(join(OUT, name), clean);
  console.log(`${name.padEnd(28)} ${(clean.length / 1024).toFixed(1)} KB`);
};
const reduced = (rules) => `@media (prefers-reduced-motion: reduce) { ${rules} }`;

// ---------------------------------------------------------------------------------------------
// Banner — name and role beside a small service topology with travelling request pulses.
// ---------------------------------------------------------------------------------------------
function banner() {
  const W = 1000;
  const H = 360;
  const nodes = {
    c1: { x: 716, y: 112, kind: "client" },
    c2: { x: 716, y: 248, kind: "client" },
    api: { x: 796, y: 180, kind: "api" },
    s1: { x: 876, y: 106, kind: "svc" },
    s2: { x: 876, y: 180, kind: "svc" },
    s3: { x: 876, y: 254, kind: "svc" },
    d1: { x: 950, y: 140, kind: "data" },
    d2: { x: 950, y: 220, kind: "data" },
  };
  const edges = [
    ["c1", "api"], ["c2", "api"], ["api", "s1"], ["api", "s2"], ["api", "s3"],
    ["s1", "d1"], ["s2", "d1"], ["s2", "d2"], ["s3", "d2"],
  ];
  const curve = (a, b) => {
    const p = nodes[a];
    const q = nodes[b];
    const mx = (p.x + q.x) / 2;
    return `M${p.x} ${p.y} C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}`;
  };
  const edgePaths = edges.map(([a, b], i) => `<path id="e${i}" class="edge" d="${curve(a, b)}"/>`).join("\n      ");
  const pulses = edges
    .map((_, i) => {
      const dur = (2.4 + (i % 4) * 0.35).toFixed(2);
      const begin = (0.9 + i * 0.41).toFixed(2);
      return `<circle class="pulse" r="2.4" fill="${C.turqSoft}" opacity="0">
        <animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite"><mpath href="#e${i}"/></animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
      </circle>`;
    })
    .join("\n      ");
  const node = ({ x, y, kind }, i) => {
    const delay = `style="animation-delay:${(i * 0.37).toFixed(2)}s"`;
    switch (kind) {
      case "api":
        return `<circle cx="${x}" cy="${y}" r="24" fill="${C.blue}" opacity=".16" class="beat"/>
      <rect x="${x - 12}" y="${y - 12}" width="24" height="24" rx="5" fill="#0b1b3a" stroke="${C.blue}" stroke-width="1.4"/>
      <rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="1.5" fill="${C.turq}" class="beat" ${delay}/>`;
      case "data":
        return `<path d="M${x - 9} ${y - 6} v12 a9 3.4 0 0 0 18 0 v-12" fill="#071a24" stroke="${C.turq}" stroke-width="1.3"/>
      <ellipse cx="${x}" cy="${y - 6}" rx="9" ry="3.4" fill="#0a2430" stroke="${C.turq}" stroke-width="1.3"/>
      <path d="M${x - 9} ${y} a9 3.4 0 0 0 18 0" fill="none" stroke="${C.turq}" stroke-width="1" opacity=".55"/>`;
      case "client":
        return `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="4" fill="#08142a" stroke="#5f7fb3" stroke-width="1.2"/>
      <rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="1.5" fill="#5f7fb3" class="beat" ${delay}/>`;
      default:
        return `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="4" fill="#071a24" stroke="${C.turq}" stroke-width="1.2"/>
      <circle cx="${x}" cy="${y}" r="3" fill="${C.turq}" class="beat" ${delay}/>`;
    }
  };
  const nodeShapes = Object.values(nodes).map(node).join("\n      ");
  const columns = [
    ["CLIENT", 716], ["API", 796], ["SERVICES", 876], ["DATA", 950],
  ]
    .map(([t, x]) => `<text x="${x}" y="58" class="m col" text-anchor="middle">${t}</text>`)
    .join("\n      ");
  const corner = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 18} V${y} H${x + sx * 18}" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="title desc">
  <title id="title">Burak Emre İleri — Software Engineer | .NET &amp; Full-Stack Developer</title>
  <desc id="desc">Animated banner: name and role beside a small service topology (client, API, services, data) with travelling request pulses.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.bg0}"/>
      <stop offset="1" stop-color="${C.bg1}"/>
    </linearGradient>
    <radialGradient id="glowTurq" cx="0.86" cy="0.08" r="0.62">
      <stop offset="0" stop-color="${C.turq}" stop-opacity=".16"/>
      <stop offset="1" stop-color="${C.turq}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBlue" cx="0.08" cy="1.05" r="0.7">
      <stop offset="0" stop-color="${C.blue}" stop-opacity=".2"/>
      <stop offset="1" stop-color="${C.blue}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M28 0H0V28" fill="none" stroke="${C.grid}" stroke-opacity=".055"/>
    </pattern>
    <linearGradient id="scan" x1="0" x2="1">
      <stop offset="0" stop-color="${C.turq}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${C.turq}" stop-opacity=".09"/>
      <stop offset="1" stop-color="${C.turq}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" x2="1">
      <stop offset="0" stop-color="${C.turq}"/>
      <stop offset=".6" stop-color="${C.blue}"/>
      <stop offset="1" stop-color="${C.blue}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>
  <style>
    .s { font-family: ${SANS}; }
    .m { font-family: ${MONO}; }
    .col { font-size: 10px; letter-spacing: .16em; fill: ${C.subtle}; }
    .edge { fill: none; stroke: ${C.turq}; stroke-opacity: .26; stroke-width: 1.2; }
    .hud { fill: none; stroke: ${C.turq}; stroke-opacity: .6; stroke-width: 1.4; }
    .rise { animation: rise 1s cubic-bezier(.22,1,.36,1) both; }
    .d1 { animation-delay: .05s; } .d2 { animation-delay: .16s; } .d3 { animation-delay: .27s; }
    .d4 { animation-delay: .38s; } .d5 { animation-delay: .6s; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
    .rule { transform-origin: 64px 0; animation: grow 1.4s .55s cubic-bezier(.22,1,.36,1) both; }
    @keyframes grow { from { transform: scaleX(0); } }
    .net { animation: fade 1.6s .45s ease both; }
    @keyframes fade { from { opacity: 0; } }
    .beat { animation: beat 3.6s ease-in-out infinite; }
    @keyframes beat { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
    .sweep { animation: sweep 9s cubic-bezier(.45,0,.55,1) 1.4s infinite; transform: translateX(-220px); }
    @keyframes sweep { 0% { transform: translateX(-220px); } 55%, 100% { transform: translateX(1220px); } }
    ${reduced(".rise, .net, .rule, .beat { animation: none; } .sweep, .pulse { display: none; }")}
    /* Embedded as an image, media queries see the image's own rendered size. On a phone-width README the
       hero text is scaled up and the decorative detail that would be too small to read is dropped. */
    @media (max-width: 520px) {
      .net, .sweep, .kicker, .tagline { display: none; }
      .hero { transform: translate(-30px, -131px) scale(1.6); }
    }
  </style>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#grid)"/>
    <rect width="${W}" height="${H}" fill="url(#glowTurq)"/>
    <rect width="${W}" height="${H}" fill="url(#glowBlue)"/>

    <g class="net">
      ${columns}
      ${edgePaths}
      ${pulses}
      ${nodeShapes}
    </g>

    <rect class="sweep" x="0" y="0" width="200" height="${H}" fill="url(#scan)"/>

    <g class="hero">
      <text x="64" y="92" class="m rise d1 kicker" font-size="13" letter-spacing=".22em" fill="${C.turq}">GITHUB.COM/BURAKEMREF</text>
      <text x="62" y="160" class="s rise d2" font-size="60" font-weight="700" letter-spacing="-1.2" fill="${C.ink}">Burak Emre İleri</text>
      <text x="64" y="212" class="s rise d3" font-size="28" font-weight="600" fill="${C.ink2}">Software Engineer</text>
      <text x="64" y="250" class="s rise d4" font-size="28" font-weight="500" fill="${C.turq}">.NET &amp; Full-Stack Developer</text>
      <rect class="rule" x="64" y="280" width="250" height="2" rx="1" fill="url(#rule)"/>
      <text x="64" y="314" class="m rise d5 tagline" font-size="13" letter-spacing=".06em" fill="${C.muted}">Clean architecture · Typed front-ends · Real-time 3D on the web</text>
    </g>

    <g class="hud">
      ${corner(16, 16, 1, 1)}
      <path d="M${W - 16} ${16 + 18} V16 H${W - 16 - 18}"/>
      <path d="M16 ${H - 16 - 18} V${H - 16} H${16 + 18}"/>
      <path d="M${W - 16} ${H - 16 - 18} V${H - 16} H${W - 16 - 18}"/>
    </g>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="17.5" fill="none" stroke="${C.border}"/>
</svg>`;
}

// ---------------------------------------------------------------------------------------------
// Tech stack tiles — one card per area; glyphs are drawn in, a light runs along the top edge.
// ---------------------------------------------------------------------------------------------
const GLYPHS = {
  // 30×30 line drawings (paths only, so pathLength-based drawing works everywhere)
  backend: [
    "M3 3h24a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M3 12h24a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z",
    "M3 21h24a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z",
    "M6 6.5h.01M6 15.5h.01M6 24.5h.01M20 6.5h4M20 15.5h4M20 24.5h4",
  ],
  frontend: [
    "M4 3h22a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z",
    "M1 9h28",
    "M10 14l-4 4 4 4M20 14l4 4-4 4M17 13l-4 10",
  ],
  data: [
    "M3 6c0-2.2 5.4-4 12-4s12 1.8 12 4-5.4 4-12 4S3 8.2 3 6z",
    "M3 6v18c0 2.2 5.4 4 12 4s12-1.8 12-4V6",
    "M3 15c0 2.2 5.4 4 12 4s12-1.8 12-4",
  ],
  "3d": [
    "M15 2l12 7v13l-12 7-12-7V9z",
    "M15 16L3 9M15 16l12-7M15 16v13",
  ],
  architecture: [
    "M15 2.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM5 21.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM15 21.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM25 21.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
    "M15 8.5V15M5 15h20M5 15v6.5M15 15v6.5M25 15v6.5",
  ],
  tooling: [
    "M8 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM8 21a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM23 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
    "M8 9v12M23 15c0 4.5-6 4-12.6 7.6",
  ],
};

const STACK = [
  { key: "backend", label: "BACKEND", items: ["C#", "ASP.NET Core", ".NET"] },
  { key: "frontend", label: "FRONTEND", items: ["React", "Next.js", "TypeScript"] },
  { key: "data", label: "DATA", items: ["PostgreSQL", "SQL Server"] },
  { key: "3d", label: "3D & GRAPHICS", items: ["Three.js", "WebGL"] },
  { key: "architecture", label: "ARCHITECTURE", items: ["REST API", "Software Architecture"] },
  { key: "tooling", label: "TOOLING", items: ["Git", "GitHub"] },
];

function tile({ key, label, items }, i) {
  const W = 280;
  const H = 150;
  const M = 5; // transparent margin: inline tiles get even gaps when they wrap
  const glyph = GLYPHS[key]
    .map((d, j) => `<path d="${d}" pathLength="1" class="draw" style="animation-delay:${(0.15 + i * 0.12 + j * 0.18).toFixed(2)}s"/>`)
    .join("\n      ");
  const lines = items
    .map((t, j) => `<text x="22" y="${80 + j * 27}" class="s item" style="animation-delay:${(0.2 + i * 0.1 + j * 0.08).toFixed(2)}s">${esc(t)}</text>`)
    .join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-M} ${-M} ${W + 2 * M} ${H + 2 * M}" width="${W + 2 * M}" height="${H + 2 * M}" role="img" aria-labelledby="t">
  <title id="t">${esc(label.charAt(0) + label.slice(1).toLowerCase())}: ${esc(items.join(", "))}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.cardHi}"/>
      <stop offset="1" stop-color="${C.card}"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" x2="1">
      <stop offset="0" stop-color="${C.turq}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${C.turqSoft}"/>
      <stop offset="1" stop-color="${C.turq}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="12"/></clipPath>
  </defs>
  <style>
    .s { font-family: ${SANS}; }
    .m { font-family: ${MONO}; }
    .item { font-size: 19px; font-weight: 600; fill: ${C.ink}; animation: in .8s cubic-bezier(.22,1,.36,1) both; }
    @keyframes in { from { opacity: 0; transform: translateX(-6px); } }
    .draw { fill: none; stroke: ${C.turq}; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round;
            animation: draw 1.3s ease both; }
    @keyframes draw { from { stroke-dasharray: 1; stroke-dashoffset: 1; } to { stroke-dasharray: 1; stroke-dashoffset: 0; } }
    .beam { transform: translateX(-90px); animation: beam 7s cubic-bezier(.45,0,.55,1) ${(1.2 + i * 0.55).toFixed(2)}s infinite; }
    @keyframes beam { 0% { transform: translateX(-90px); } 30%, 100% { transform: translateX(${W + 10}px); } }
    ${reduced(".item, .draw { animation: none; } .beam { display: none; }")}
  </style>
  <g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect class="beam" x="0" y="0" width="90" height="1.6" fill="url(#beam)"/>
    <text x="22" y="34" class="m" font-size="11" fill="${C.turq}">${String(i + 1).padStart(2, "0")}</text>
    <text x="44" y="34" class="m" font-size="11" letter-spacing=".16em" fill="${C.muted}">${esc(label)}</text>
    <g transform="translate(${W - 52} 18)">
      ${glyph}
    </g>
    ${lines}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="11.5" fill="none" stroke="${C.border}"/>
</svg>`;
}

// ---------------------------------------------------------------------------------------------
// Featured project card — only real, public repositories (facts taken from the repository).
// ---------------------------------------------------------------------------------------------
function projectCard({ name, lines, tags }) {
  const W = 400;
  const H = 200;
  let x = 22;
  const chips = tags
    .map((t) => {
      const w = Math.round(t.length * 7.2 + 18);
      const chip = `<rect x="${x}" y="${H - 44}" width="${w}" height="22" rx="11" fill="none" stroke="${C.border}"/>
    <text x="${x + w / 2}" y="${H - 29}" class="m" font-size="11" text-anchor="middle" fill="${C.ink2}">${esc(t)}</text>`;
      x += w + 8;
      return chip;
    })
    .join("\n    ");
  const desc = lines.map((l, j) => `<text x="22" y="${100 + j * 21}" class="s" font-size="14.5" fill="${C.muted}">${esc(l)}</text>`).join("\n    ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
  <title id="t">${esc(name)} — ${esc(lines.join(" "))}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.cardHi}"/>
      <stop offset="1" stop-color="${C.card}"/>
    </linearGradient>
    <radialGradient id="glow" cx="1" cy="0" r=".9">
      <stop offset="0" stop-color="${C.blue}" stop-opacity=".18"/>
      <stop offset="1" stop-color="${C.blue}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="12"/></clipPath>
  </defs>
  <style>
    .s { font-family: ${SANS}; }
    .m { font-family: ${MONO}; }
    .dot { animation: beat 3s ease-in-out infinite; }
    @keyframes beat { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
    ${reduced(".dot { animation: none; }")}
  </style>
  <g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <circle cx="27" cy="30" r="3.5" fill="${C.turq}" class="dot"/>
    <text x="38" y="34" class="m" font-size="11" letter-spacing=".16em" fill="${C.muted}">PUBLIC REPOSITORY</text>
    <text x="${W - 22}" y="34" class="m" font-size="12" text-anchor="end" fill="${C.turq}">↗</text>
    <text x="22" y="72" class="s" font-size="26" font-weight="700" letter-spacing="-.4" fill="${C.ink}">${esc(name)}</text>
    ${desc}
    ${chips}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="11.5" fill="none" stroke="${C.border}"/>
</svg>`;
}

// ---------------------------------------------------------------------------------------------
// Contact chips
// ---------------------------------------------------------------------------------------------
function chip({ label, value, width }) {
  const H = 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="img" aria-labelledby="t">
  <title id="t">${esc(label)}: ${esc(value)}</title>
  <style>.s { font-family: ${SANS}; } .m { font-family: ${MONO}; }</style>
  <rect x=".5" y=".5" width="${width - 1}" height="${H - 1}" rx="10" fill="${C.card}" stroke="${C.border}"/>
  <rect x="0" y="14" width="2.5" height="24" rx="1.25" fill="${C.turq}"/>
  <text x="18" y="22" class="m" font-size="10" letter-spacing=".16em" fill="${C.muted}">${esc(label)}</text>
  <text x="18" y="40" class="s" font-size="15" font-weight="600" fill="${C.ink}">${esc(value)}</text>
  <text x="${width - 16}" y="31" class="m" font-size="13" text-anchor="end" fill="${C.turq}">↗</text>
</svg>`;
}

write("banner.svg", banner());
STACK.forEach((s, i) => write(`stack-${s.key}.svg`, tile(s, i)));
write(
  "project-usersdot.svg",
  projectCard({
    name: "Usersdot",
    lines: ["User management app: a NestJS REST API with", "Knex, MySQL and bcrypt, plus a React and", "Ant Design client."],
    tags: ["TypeScript", "NestJS", "React", "MySQL"],
  }),
);
write(
  "project-profile.svg",
  projectCard({
    name: "This profile",
    lines: ["Hand-built SVG artwork and a GitHub Actions", "workflow that redraws the contribution snake", "and statistics cards from GraphQL every day."],
    tags: ["SVG", "GitHub Actions", "Node.js", "GraphQL"],
  }),
);
write("contact-github.svg", chip({ label: "GITHUB", value: "BURAKEMREF", width: 220 }));
write("contact-email.svg", chip({ label: "EMAIL", value: "burakemre2142@gmail.com", width: 270 }));
