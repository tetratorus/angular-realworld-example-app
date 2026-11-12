#!/usr/bin/env node
// Side-by-side Angular | React | diff image for one parity state.
// Usage: node scripts/compose-comparison.mjs <screen> <journey--state> <out.png>
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const [screen, state, out] = process.argv.slice(2);
const load = p => PNG.sync.read(readFileSync(p));
const imgs = [
  load(`evidence/${screen}/screens/${state}--angular.png`),
  load(`evidence/${screen}/screens/${state}--react.png`),
  load(`evidence/${screen}/diffs/${state}--diff.png`),
];
const gap = 24;
const width = imgs.reduce((w, i) => w + i.width, 0) + gap * (imgs.length - 1);
const height = Math.max(...imgs.map(i => i.height));
const dst = new PNG({ width, height });
dst.data.fill(255);
let x = 0;
for (const img of imgs) {
  PNG.bitblt(img, dst, 0, 0, img.width, img.height, x, 0);
  x += img.width + gap;
}
writeFileSync(out, PNG.sync.write(dst));
console.log(`${out}: Angular | React | diff (${width}x${height})`);
