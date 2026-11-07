// Live captures shortly after a slide lands, to review each slide's own entrance (bars grow, lines draw, dots pop, points move).
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const root = process.argv[2], list = (process.argv[3] || '6,7').split(',').map(Number), at = +(process.argv[4] || 700);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(pathToFileURL(root + '/deck/index.html').href + '#1');
await p.waitForFunction(() => window.__ready === true);
for (const n of list) {
  await p.evaluate(n => { location.hash = '#' + (n - 1); }, n);
  await p.waitForFunction(() => !window.__state().tweening, null, { timeout: 20000 }); await p.waitForTimeout(500);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('.slide.is-in') && !window.__state().tweening, null, { timeout: 20000 });
  await p.waitForTimeout(at);
  await p.screenshot({ path: `${root}/shots/enter_${n}_${at}.png` });
}
await b.close();
