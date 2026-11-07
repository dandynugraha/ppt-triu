// Screenshots every slide in settled state: shots/NN.png @1920x1080, plus 1280x720 for first/middle/last.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(resolve(root, 'deck/index.html')).href + '?static';
mkdirSync(resolve(root, 'shots'), { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
async function run(w, h, list, suffix) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  const count = await page.evaluate(() => window.DECK.slides.length);
  for (const n of (list || [...Array(count).keys()])) {
    await page.evaluate(n => window.__go(n), n);
    await page.waitForFunction(() => window.__ready === true);
    await page.screenshot({ path: resolve(root, `shots/${String(n).padStart(2, '0')}${suffix}.png`) });
  }
  await page.close();
  return count;
}
const c = await run(1920, 1080, null, '');
await run(1280, 720, [1, 7, c - 1], '_720');
await browser.close();
console.log(`shots: ${c} + 3 small  errors: ${errs.length}`); if (errs.length) console.log(errs.join('\n'));
