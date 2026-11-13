// Draws context-chart.svg, the proof's picture on the landing and on the docs' proof page: the
// author's mean context per request by day, the days after the 400K window shaded, each period's
// mean dashed and the drop between them marked. The numbers are content/docs/proof.md's table
// (measured for 0.5.1, CHANGELOG.md); change both together. The colours are the site's tokens,
// written out: an <img> reads no CSS.
// Usage: node scripts/chart.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** [UTC day, requests, mean context per request in thousands of tokens]; days under 50 requests
 *  are left out. */
const DAILY = [
  ['2026-09-22', 766, 459], ['2026-09-23', 357, 386], ['2026-09-24', 1413, 387], ['2026-09-25', 1194, 370],
  ['2026-09-26', 833, 560], ['2026-09-27', 821, 560], ['2026-09-28', 305, 169], ['2026-09-29', 1160, 417],
  ['2026-09-30', 1025, 372], ['2026-10-01', 1225, 425], ['2026-10-02', 653, 459], ['2026-10-03', 1319, 385],
  ['2026-10-04', 1568, 379], ['2026-10-05', 744, 399], ['2026-10-09', 146, 236], ['2026-10-10', 608, 356],
  ['2026-10-11', 1039, 337], ['2026-10-16', 630, 260], ['2026-10-17', 684, 348], ['2026-10-18', 2706, 424],
  ['2026-10-19', 1276, 444], ['2026-10-20', 1622, 486], ['2026-10-21', 1394, 460], ['2026-10-22', 2177, 444],
  ['2026-10-23', 2430, 460], ['2026-10-24', 743, 515], ['2026-10-25', 3284, 211], ['2026-10-26', 2264, 226],
  ['2026-10-27', 1948, 208], ['2026-10-28', 3173, 224], ['2026-10-29', 1779, 210], ['2026-10-30', 318, 214],
  ['2026-10-31', 3213, 228], ['2026-11-01', 3292, 220],
].map(([day, requests, context]) => ({ day, requests, context }));
/** The day the window went from 1M to 400K. */
const SWITCH = '2026-10-25';
/** Each period's mean over all its requests (not the mean of the days). */
const BEFORE = { from: '2026-09-22', to: '2026-10-21', context: 412, label: 'month before: 412K', at: '2026-10-13' };
const AFTER = { from: '2026-10-25', to: '2026-11-01', context: 219, label: 'after: 219K', at: '2026-11-01' };

const C = { ground: '#000000', grid: '#222221', axis: '#8b8b87', text: '#b0b0ad', line: '#f4f4f2', after: '#f4f4f2', mean: '#8b8b87' };
const FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

const W = 760;
const H = 340;
const PAD = { top: 58, right: 22, bottom: 36, left: 54 };
const MAX = 600;
const DAY = 86_400_000;
const t0 = Date.parse(DAILY[0].day);
const t1 = Date.parse(DAILY.at(-1).day);
const x = (day) => PAD.left + ((Date.parse(day) - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
const y = (k) => PAD.top + (1 - k / MAX) * (H - PAD.top - PAD.bottom);
const f = (n) => n.toFixed(1);
const pt = (p) => `${f(x(p.day))},${f(y(p.context))}`;
const label = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const BASE = y(0);

// Runs of consecutive days: solid within a run, dotted across a gap of days with no data.
const runs = [];
DAILY.forEach((p, i) => {
  if (i === 0 || Date.parse(p.day) - Date.parse(DAILY[i - 1].day) > DAY) runs.push([p]);
  else runs.at(-1).push(p);
});
const gaps = runs.slice(1).map((run, i) => [runs[i].at(-1), run[0]]);
const drop = Math.round((1 - AFTER.context / BEFORE.context) * 100);
const sx = x(SWITCH);
const bx = sx - 24;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}" role="img" aria-label="Mean context per request fell from ${BEFORE.context}K tokens in the month before to ${AFTER.context}K after 25 October, when the compaction window went to 400K: ${drop}% less.">
  <defs>
    <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${C.line}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${C.line}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.ground}"/>
  <text x="${PAD.left - 34}" y="26" fill="${C.line}" font-size="14" font-weight="600">Context per request, by day</text>
  <text x="${PAD.left - 34}" y="44" fill="${C.axis}" font-size="12">thousands of tokens, mean · one developer’s transcripts</text>
  <rect x="${f(sx)}" y="${PAD.top}" width="${f(W - PAD.right - sx)}" height="${f(BASE - PAD.top)}" fill="${C.after}" fill-opacity="0.05"/>
  <text x="${f(sx + 9)}" y="${PAD.top + 16}" fill="${C.text}" font-size="11">400K window</text>
${[0, 200, 400, 600]
  .map((t) => `  <line x1="${PAD.left}" x2="${W - PAD.right}" y1="${f(y(t))}" y2="${f(y(t))}" stroke="${C.grid}"/>\n  <text x="${PAD.left - 10}" y="${f(y(t) + 4)}" fill="${C.axis}" font-size="11" text-anchor="end">${t}K</text>`)
  .join('\n')}
${[[DAILY[0].day, 'start'], ['2026-10-11', 'middle'], [DAILY.at(-1).day, 'end']]
  .map(([d, anchor]) => `  <text x="${f(x(d))}" y="${H - 12}" fill="${C.axis}" font-size="11" text-anchor="${anchor}">${label(d)}</text>`)
  .join('\n')}
${runs.map((run) => `  <path d="M${f(x(run[0].day))},${f(BASE)}L${run.map(pt).join('L')}L${f(x(run.at(-1).day))},${f(BASE)}Z" fill="url(#area)"/>`).join('\n')}
${gaps.map(([a, b]) => `  <path d="M${pt(a)}L${pt(b)}" stroke="${C.line}" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="2 4" fill="none"/>`).join('\n')}
${runs.map((run) => `  <path d="M${run.map(pt).join('L')}" stroke="${C.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`).join('\n')}
${[BEFORE, AFTER].map((m) => `  <line x1="${f(x(m.from))}" x2="${f(x(m.to))}" y1="${f(y(m.context))}" y2="${f(y(m.context))}" stroke="${C.mean}" stroke-width="1.5" stroke-dasharray="6 5"/>`).join('\n')}
  <text x="${f(x(BEFORE.at))}" y="${f(y(BEFORE.context) - 10)}" fill="${C.text}" font-size="12" text-anchor="middle">${BEFORE.label}</text>
  <text x="${f(x(AFTER.at))}" y="${f(y(AFTER.context) + 22)}" fill="${C.text}" font-size="12" text-anchor="end">${AFTER.label}</text>
  <line x1="${f(bx)}" x2="${f(bx)}" y1="${f(y(BEFORE.context) + 5)}" y2="${f(y(AFTER.context) - 4)}" stroke="${C.line}" stroke-width="1.5"/>
  <path d="M${f(bx - 5)},${f(y(AFTER.context) - 11)}L${f(bx)},${f(y(AFTER.context) - 3)}L${f(bx + 5)},${f(y(AFTER.context) - 11)}" stroke="${C.line}" stroke-width="1.5" fill="none"/>
  <text x="${f(bx - 10)}" y="${f((y(BEFORE.context) + y(AFTER.context)) / 2 + 6)}" fill="${C.line}" font-size="18" font-weight="600" text-anchor="end">−${drop}%</text>
</svg>
`;

// The landing's card shows it from public/, the proof page from the docs' assets.
for (const path of ['public/context-chart.svg', 'content/docs/assets/context-chart.svg']) {
  writeFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), svg);
  console.log(`wrote ${path}`);
}
