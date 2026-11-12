#!/usr/bin/env node
// Builds evidence/<screen>/report.md from evidence/<screen>/results/*.json, plus evidence/parity-results.md.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EV = join(ROOT, 'evidence');
const mark = ok => (ok ? 'PASS' : 'FAIL');
const rows = [];

for (const screen of readdirSync(EV, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()) {
  const resDir = join(EV, screen, 'results');
  if (!existsSync(resDir)) continue;
  const dir = join(EV, screen);
  const rel = p => (p ? relative(dir, p) : '');
  const results = readdirSync(resDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(resDir, f), 'utf8')));
  const deviationsFile = join(dir, 'deviations.md');
  const deviations = existsSync(deviationsFile) ? readFileSync(deviationsFile, 'utf8').trim() : '_None recorded._';
  let md = `# Parity report: ${screen}\n\nAngular (http://localhost:4200) vs React (http://localhost:5173), same seeded mock API reset before each run, viewport 1440×900, dates/avatars masked in magenta. Visual pass threshold: ≤1% differing pixels (pixelmatch, threshold 0.1).\n\n`;
  md += `| Journey | No errors | Same states | Visual | API calls + payloads | Functional | Max diff | Result |\n|---|---|---|---|---|---|---|---|\n`;
  for (const r of results) {
    const c = r.checks;
    const ok = Object.values(c).every(Boolean);
    const max = Math.max(0, ...r.shots.map(s => s.pct));
    md += `| ${r.journey} | ${mark(c.noErrors)} | ${mark(c.sameScreens)} | ${mark(c.visual)} | ${mark(c.apiCalls)} | ${mark(c.observations)} | ${max.toFixed(3)}% | **${mark(ok)}** |\n`;
    rows.push({ screen, journey: r.journey, ok, max, checks: c, ranAt: r.ranAt });
  }
  for (const r of results) {
    md += `\n## ${r.journey}\n\n`;
    if (r.errors.angular || r.errors.react) md += `Errors: Angular: \`${r.errors.angular}\` · React: \`${r.errors.react}\`\n\n`;
    if (r.video) md += `React journey video: [${rel(r.video)}](${rel(r.video)})\n\n`;
    md += `| State | Diff | Angular | React | Diff image |\n|---|---|---|---|---|\n`;
    for (const s of r.shots)
      md += `| ${s.name} | ${s.missing ? 'missing' : s.pct.toFixed(3) + '%'} ${mark(s.pass)} | ![](${rel(s.angular)}) | ![](${rel(s.react)}) | ![](${rel(s.diff)}) |\n`;
    const fmt = c => `${c.method} ${c.path}${Object.keys(c.query).length ? '?' + new URLSearchParams(c.query) : ''}${c.body ? ' ' + JSON.stringify(c.body) : ''} → ${c.status ?? '?'}`;
    md += `\nAPI calls (${mark(r.checks.apiCalls)}):\n\n| # | Angular | React |\n|---|---|---|\n`;
    const n = Math.max(r.apiCalls.angular.length, r.apiCalls.react.length);
    for (let i = 0; i < n; i++)
      md += `| ${i + 1} | \`${r.apiCalls.angular[i] ? fmt(r.apiCalls.angular[i]) : '—'}\` | \`${r.apiCalls.react[i] ? fmt(r.apiCalls.react[i]) : '—'}\` |\n`;
    md += `\nFunctional observations (${mark(r.checks.observations)}):\n\n| Key | Angular | React |\n|---|---|---|\n`;
    const keys = [...new Set([...Object.keys(r.observations.angular), ...Object.keys(r.observations.react)])];
    for (const k of keys)
      md += `| ${k} | \`${JSON.stringify(r.observations.angular[k])}\` | \`${JSON.stringify(r.observations.react[k])}\` |\n`;
  }
  md += `\n## Deviations\n\n${deviations}\n`;
  writeFileSync(join(dir, 'report.md'), md);
}

let all = `# Parity results (all screens)\n\n| Screen | Journey | Max diff | Result | Ran at |\n|---|---|---|---|---|\n`;
for (const r of rows) all += `| ${r.screen} | ${r.journey} | ${r.max.toFixed(3)}% | ${mark(r.ok)} | ${r.ranAt} |\n`;
all += `\n**${rows.filter(r => r.ok).length} / ${rows.length} journeys pass all checks.**\n`;
writeFileSync(join(EV, 'parity-results.md'), all);
console.log(all);
