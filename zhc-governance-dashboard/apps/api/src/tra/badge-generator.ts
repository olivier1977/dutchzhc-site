/**
 * TRA Badge Generator
 * Generates an embeddable SVG badge with the agent's TRA score and rating.
 */

const RATING_COLORS: Record<string, { fill: string; text: string }> = {
  AAA: { fill: "#10b981", text: "#fff" },
  AA:  { fill: "#34d399", text: "#000" },
  A:   { fill: "#6ee7b7", text: "#000" },
  BBB: { fill: "#f59e0b", text: "#000" },
  BB:  { fill: "#fbbf24", text: "#000" },
  B:   { fill: "#f97316", text: "#fff" },
  C:   { fill: "#ef4444", text: "#fff" },
  D:   { fill: "#7f1d1d", text: "#fff" },
};

export function generateTraBadgeSvg(opts: {
  agentName: string;
  score: number;
  rating: string;
  shareUrl?: string;
}): string {
  const { agentName, score, rating, shareUrl } = opts;
  const color = RATING_COLORS[rating] ?? { fill: "#6b7280", text: "#fff" };
  const displayName = agentName.length > 20 ? agentName.slice(0, 18) + "…" : agentName;
  const barWidth = Math.round((score / 100) * 80);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="200" height="56" role="img" aria-label="TRA Score: ${score} ${rating}">
  <title>TRA Score: ${score} (${rating})</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e1e2e"/>
      <stop offset="1" stop-color="#161622"/>
    </linearGradient>
    <clipPath id="r"><rect width="200" height="56" rx="8"/></clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="200" height="56" fill="url(#bg)"/>
    <rect width="200" height="1" y="55" fill="#ffffff" fill-opacity="0.08"/>
    <rect width="200" height="1" fill="#ffffff" fill-opacity="0.05"/>
  </g>
  <!-- Label -->
  <text x="10" y="17" font-family="system-ui, sans-serif" font-size="9" font-weight="600"
    fill="#6b7280" letter-spacing="1">TRA SCORE</text>
  <!-- Agent name -->
  <text x="10" y="31" font-family="system-ui, sans-serif" font-size="11" font-weight="500"
    fill="#e5e7eb">${escapeXml(displayName)}</text>
  <!-- Score bar background -->
  <rect x="10" y="38" width="80" height="5" rx="2.5" fill="#ffffff" fill-opacity="0.07"/>
  <!-- Score bar fill -->
  <rect x="10" y="38" width="${barWidth}" height="5" rx="2.5" fill="${color.fill}" fill-opacity="0.8"/>
  <!-- Score number -->
  <text x="96" y="43" font-family="system-ui, sans-serif" font-size="11" font-weight="700"
    fill="${color.fill}">${score}</text>
  <!-- Rating badge -->
  <rect x="147" y="24" width="43" height="22" rx="5" fill="${color.fill}"/>
  <text x="168.5" y="39" font-family="system-ui, sans-serif" font-size="12" font-weight="700"
    fill="${color.text}" text-anchor="middle">${escapeXml(rating)}</text>
  ${shareUrl ? `<a xlink:href="${escapeXml(shareUrl)}" target="_blank">
    <rect width="200" height="56" fill="transparent"/>
  </a>` : ""}
</svg>`.trim();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
