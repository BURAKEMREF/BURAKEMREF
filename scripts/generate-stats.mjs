// Builds the "GitHub Statistics" cards from the GitHub GraphQL API — no third-party image service.
// Runs daily in .github/workflows/profile-assets.yml with the workflow token, so it reads public data only.
//
//   GITHUB_TOKEN   token for the GraphQL API
//   PROFILE_LOGIN  GitHub login to describe
//   OUT_DIR        output folder (default: dist)
//
// Every number on the cards comes straight from the API response; nothing is estimated or padded.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const token = process.env.GITHUB_TOKEN;
const login = process.env.PROFILE_LOGIN;
const outDir = process.env.OUT_DIR || "dist";
if (!token || !login) {
  console.error("GITHUB_TOKEN and PROFILE_LOGIN are required.");
  process.exit(1);
}

const query = `query ($login: String!) {
  user(login: $login) {
    createdAt
    followers { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
      totalCount
      nodes { stargazerCount }
    }
    contributionsCollection {
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
      contributionCalendar { totalContributions weeks { contributionDays { contributionCount } } }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": `${login}-profile-stats` },
  body: JSON.stringify({ query, variables: { login } }),
});
const body = await res.json();
if (!res.ok || body.errors || !body.data?.user) {
  console.error("GraphQL request failed:", res.status, JSON.stringify(body.errors ?? body).slice(0, 500));
  process.exit(1);
}
const u = body.data.user;
const cc = u.contributionsCollection;
const weeks = cc.contributionCalendar.weeks.map((w) => w.contributionDays.reduce((s, d) => s + d.contributionCount, 0));
const stats = {
  total: cc.contributionCalendar.totalContributions,
  commits: cc.totalCommitContributions,
  prs: cc.totalPullRequestContributions,
  issues: cc.totalIssueContributions,
  reviews: cc.totalPullRequestReviewContributions,
  restricted: cc.restrictedContributionsCount,
  repos: u.repositories.totalCount,
  stars: u.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
  followers: u.followers.totalCount,
  since: new Date(u.createdAt).getUTCFullYear(),
  updated: new Date().toISOString().slice(0, 10),
};
console.log("stats:", JSON.stringify(stats));

// ---------------------------------------------------------------------------------------------
const C = {
  card: "#070d1a", cardHi: "#0b1527", border: "#1a2840", ink: "#eef4ff", muted: "#8fa6c8", subtle: "#6b83a8",
  turq: "#2ee6d6", blue: "#3d7bff",
};
const SANS = "'Segoe UI Variable Display','Segoe UI',-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',Inter,Roboto,Arial,sans-serif";
const MONO = "'JetBrains Mono','Cascadia Code','SF Mono',Menlo,Consolas,'Liberation Mono',monospace";
const fmt = (n) => n.toLocaleString("en-US");

const shell = (W, H, title, inner, extraCss = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
  <title id="t">${title}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.cardHi}"/>
      <stop offset="1" stop-color="${C.card}"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${C.blue}"/>
      <stop offset="1" stop-color="${C.turq}"/>
    </linearGradient>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="12"/></clipPath>
  </defs>
  <style>
    .s { font-family: ${SANS}; }
    .m { font-family: ${MONO}; }
    .rise { animation: rise .9s cubic-bezier(.22,1,.36,1) both; }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } }
    .dot { animation: beat 3s ease-in-out infinite; }
    @keyframes beat { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
    ${extraCss}
    @media (prefers-reduced-motion: reduce) { .rise, .grow, .dot { animation: none; } }
  </style>
  <g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${inner}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="11.5" fill="none" stroke="${C.border}"/>
</svg>
`;

const header = (text) => `<circle cx="27" cy="29" r="3.5" fill="${C.turq}" class="dot"/>
    <text x="38" y="33" class="m" font-size="11" letter-spacing=".16em" fill="${C.muted}">${text}</text>`;

function activityCard(s) {
  const W = 400;
  const H = 200;
  const max = Math.max(...weeks, 0);
  const left = 22;
  const width = W - 44;
  const gap = 1.6;
  const bw = (width - gap * (weeks.length - 1)) / weeks.length;
  const base = 146;
  const maxH = 34;
  const bars = weeks
    .map((v, i) => {
      const h = max === 0 ? 0 : Math.max(v > 0 ? 2 : 0, (v / max) * maxH);
      const x = (left + i * (bw + gap)).toFixed(2);
      const track = `<rect x="${x}" y="${base - maxH}" width="${bw.toFixed(2)}" height="${maxH}" rx="1" fill="${C.border}" opacity=".35"/>`;
      if (h === 0) return track;
      return `${track}<rect class="grow" style="animation-delay:${(0.25 + i * 0.012).toFixed(3)}s" x="${x}" y="${(base - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="1" fill="url(#bar)"/>`;
    })
    .join("\n    ");
  const parts = [
    ["COMMITS", s.commits],
    ["PRS", s.prs],
    ["ISSUES", s.issues],
    ["REVIEWS", s.reviews],
    ...(s.restricted > 0 ? [["PRIVATE", s.restricted]] : []),
  ];
  // fixed columns (label over value) so no platform font can push the row past the card edge
  const col = width / parts.length;
  const breakdown = parts
    .map(([k, v], i) => {
      const x = (left + i * col).toFixed(1);
      return `<text x="${x}" y="172" class="m" font-size="9.5" letter-spacing=".1em" fill="${C.muted}">${k}</text>
    <text x="${x}" y="190" class="s" font-size="15" font-weight="600" fill="${C.ink}">${fmt(v)}</text>`;
    })
    .join("\n    ");
  const inner = `${header("ACTIVITY · LAST 12 MONTHS")}
    <text x="22" y="80" class="s rise" font-size="38" font-weight="700" letter-spacing="-.5" fill="${C.ink}">${fmt(s.total)}</text>
    <text x="22" y="101" class="m rise" style="animation-delay:.1s" font-size="11.5" letter-spacing=".04em" fill="${C.muted}">contributions on GitHub</text>
    ${bars}
    ${breakdown}`;
  const css = `.grow { transform-box: fill-box; transform-origin: 50% 100%; animation: grow .7s cubic-bezier(.22,1,.36,1) both; }
    @keyframes grow { from { transform: scaleY(0); } }`;
  return shell(W, H, `${fmt(s.total)} contributions on GitHub in the last 12 months`, inner, css);
}

function profileCard(s) {
  const W = 400;
  const H = 200;
  const cell = (x, y, value, label, i) => `<text x="${x}" y="${y}" class="s rise" style="animation-delay:${(0.05 + i * 0.08).toFixed(2)}s" font-size="30" font-weight="700" letter-spacing="-.4" fill="${C.ink}">${value}</text>
    <text x="${x}" y="${y + 20}" class="m rise" style="animation-delay:${(0.1 + i * 0.08).toFixed(2)}s" font-size="11" letter-spacing=".06em" fill="${C.muted}">${label}</text>`;
  const inner = `${header("PUBLIC PROFILE")}
    ${cell(22, 80, fmt(s.repos), "public repositories", 0)}
    ${cell(212, 80, fmt(s.stars), "stars earned", 1)}
    ${cell(22, 140, fmt(s.followers), "followers", 2)}
    ${cell(212, 140, String(s.since), "on GitHub since", 3)}
    <text x="22" y="186" class="m" font-size="10" letter-spacing=".04em" fill="${C.subtle}">updated ${s.updated} · GitHub GraphQL API</text>`;
  return shell(W, H, `${s.repos} public repositories, ${s.stars} stars, ${s.followers} followers, on GitHub since ${s.since}`, inner);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "stats-activity.svg"), activityCard(stats));
writeFileSync(join(outDir, "stats-profile.svg"), profileCard(stats));
console.log(`written: ${join(outDir, "stats-activity.svg")}, ${join(outDir, "stats-profile.svg")}`);
