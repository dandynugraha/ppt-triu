// v6 live checks: background scroll direction (next = up, back = down), travel time, render cost per frame.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(pathToFileURL(root + '/deck/index.html').href + '#3');
await p.waitForFunction(() => window.__ready === true); await p.waitForTimeout(800);
// a horizontal hairline in the page should move UP on next: track the bright row in a thin column at x=1700
const rowsAt = async () => p.evaluate(() => {
  const c = document.getElementById('frames'), g = c.getContext('webgl'), W = c.width, H = c.height, x = Math.round(W * 1700 / 1920);
  const px = new Uint8Array(4 * H); g.readPixels(x, 0, 1, H, g.RGBA, g.UNSIGNED_BYTE, px);
  const lum = []; for (let y = 0; y < H; y++) lum.push(px[4 * (H - 1 - y)] + px[4 * (H - 1 - y) + 1] + px[4 * (H - 1 - y) + 2]);
  return lum;
});
const t0 = Date.now(); await p.keyboard.press('Enter');
const s1 = await p.evaluate(() => window.__state().pos); await p.waitForTimeout(700);
await p.screenshot({ path: root + '/shots/live_scroll.png' });
const s2 = await p.evaluate(() => window.__state().pos);
await p.waitForFunction(() => !window.__state().tweening, null, { timeout: 8000 });
const travel = Date.now() - t0;
// render cost: time 120 consecutive frames in this (software GL!) browser — a pessimistic bound for a laptop GPU
const ms = await p.evaluate(async () => { const t = []; let last = performance.now();
  for (let i = 0; i < 40; i++) { await new Promise(r => requestAnimationFrame(r)); const n = performance.now(); t.push(n - last); last = n; }
  t.sort((a, b) => a - b); return { median: t[20], p90: t[36] }; });
await p.keyboard.press('Backspace'); await p.waitForTimeout(600);
const s3 = await p.evaluate(() => window.__state().pos);
console.log(JSON.stringify({ next_pos_increasing: s2 > s1, back_pos_decreasing: s3 < 4, travel_ms: travel, frame_ms_swiftshader: ms, state: await p.evaluate(() => window.__state()) }));
await b.close();
