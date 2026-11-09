// Screenshots of slides in their final build state (hold frames, ?static).
// usage: node web/tools/shots.mjs [outDir] [ids comma-separated] [width] [height]
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'shots'));
const only = process.argv[3] ? process.argv[3].split(',') : null;
const W = +(process.argv[4] || 1920), H = +(process.argv[5] || 1080);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '?static');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
const ids = await page.evaluate(() => window.DECK.S.map(s => [s.id, s.steps]));
let n = 0;
for (const [id, steps] of ids) {
  n++;
  if (only && !only.includes(id)) continue;
  await page.evaluate(([id, steps]) => window.__go(id, steps), [id, steps]);
  await page.evaluate(() => Promise.all([...document.querySelectorAll('.slide.on img, #protein img')].map(i => i.decode().catch(() => 0))));
  await page.waitForTimeout(id.startsWith('6') ? 1500 : 300);
  const f = path.join(out, `${String(n).padStart(2, '0')}_${id}${W !== 1920 ? '_' + W : ''}.png`);
  await page.screenshot({ path: f });
  console.log('shot', f);
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
